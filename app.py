# --- Imports
from flask import Flask, redirect, render_template, request, session, url_for, jsonify, g
from flask_compress import Compress
from flask_sqlalchemy import SQLAlchemy
import os
import os.path
import sys
import codecs
import datetime
import json
import uuid
import base64
from random import randint
from Crypto import Random
from Crypto.Cipher import AES
from hashlib import md5
from flask_cors import CORS

try:
    from instagram_private_api import (
        Client, ClientError, ClientLoginError,
        ClientCookieExpiredError, ClientLoginRequiredError,
        __version__ as client_version)
except ImportError:
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from instagram_private_api import (
        Client, ClientError, ClientLoginError,
        ClientCookieExpiredError, ClientLoginRequiredError,
        __version__ as client_version)


# --- configure flask
app = Flask(__name__)
app.secret_key = uuid.uuid4().hex

Compress(app)
CORS(app)

# --- configure root directory path relative to this file
THIS_FOLDER_G = ""
if getattr(sys, 'frozen', False):
    # frozen
    THIS_FOLDER_G = os.path.dirname(sys.executable)
else:
    # unfrozen
    THIS_FOLDER_G = os.path.dirname(os.path.realpath(__file__))


# --- configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + THIS_FOLDER_G + '/db/db.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
db = SQLAlchemy(app)


"""
    Models
"""
class Keys(db.Model):
    _id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.String(200), unique=True, nullable=False)
    sec_key = db.Column(db.String(200), unique=True, nullable=False)

    def __repr__(self):
        return '<Keys %r>' % self.client_id


class Users(db.Model):
    _id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(200), unique=True, nullable=False)
    client_id_list = db.Column(db.Text, unique=False, nullable=False)
    is_active = db.Column(db.Boolean, unique=False, nullable=True)
    initial_followers = db.Column(db.Text, unique=False, nullable=True)

    def __repr__(self):
        return '<Users %r>' % self.username


"""
    Helper functions to decrypt data
"""
def decrypt_data(ciphered_text, _password):
    """https://stackoverflow.com/questions/36762098/how-to-decrypt-password-from-javascript-cryptojs-aes-encryptpassword-passphras"""
    BLOCK_SIZE = 16
    _password = _password.encode()

    def pad(data):
        length = BLOCK_SIZE - (len(data) % BLOCK_SIZE)
        return data + (chr(length)*length).encode()

    def unpad(data):
        return data[:-(data[-1] if type(data[-1]) == int else ord(data[-1]))]

    def bytes_to_key(data, salt, output=48):
        # extended from https://gist.github.com/gsakkis/4546068
        assert len(salt) == 8, len(salt)
        data += salt
        key = md5(data).digest()
        final_key = key
        while len(final_key) < output:
            key = md5(key + data).digest()
            final_key += key
        return final_key[:output]

    def encrypt(message, passphrase):
        salt = Random.new().read(8)
        key_iv = bytes_to_key(passphrase, salt, 32+16)
        key = key_iv[:32]
        iv = key_iv[32:]
        aes = AES.new(key, AES.MODE_CBC, iv)
        return base64.b64encode(b"Salted__" + salt + aes.encrypt(pad(message)))

    def decrypt(encrypted, passphrase):
        encrypted = base64.b64decode(encrypted)
        assert encrypted[0:8] == b"Salted__"
        salt = encrypted[8:16]
        key_iv = bytes_to_key(passphrase, salt, 32+16)
        key = key_iv[:32]
        iv = key_iv[32:]
        aes = AES.new(key, AES.MODE_CBC, iv)
        return unpad(aes.decrypt(encrypted[16:]))

    pt = decrypt(ciphered_text, _password)
    return pt.decode()


def get_SEC_KEY(_ID):
    key_obj = Keys.query.filter_by(client_id=_ID).first()
    
    if key_obj is not None and _ID == key_obj.client_id:
        SEC_KEY = key_obj.sec_key
    else:
        SEC_KEY = "Not Found"
    
    return SEC_KEY


# --- Helper Functions for instagram Login
def to_json(python_object):
    if isinstance(python_object, bytes):
        return {'__class__': 'bytes',
                '__value__': codecs.encode(python_object, 'base64').decode()}
    raise TypeError(repr(python_object) + ' is not JSON serializable')

def from_json(json_object):
    if '__class__' in json_object and json_object['__class__'] == 'bytes':
        return codecs.decode(json_object['__value__'].encode(), 'base64')
    return json_object

def onlogin_callback(api, new_settings_file):
    cache_settings = api.settings
    with open(new_settings_file, 'w') as outfile:
        json.dump(cache_settings, outfile, default=to_json)
        print('SAVED: {0!s}'.format(new_settings_file))

def ig_login(username, password, _ID, new_login=False):
    if new_login is False:
        user_db = Users.query.filter_by(username=username).first()
        if user_db is None:
            return {"status": "error", "msg": "New User."}
    
    device_id = None
    settings_file = THIS_FOLDER_G + "/db/data/cookies/" + username + "_" + _ID + ""

    try:
        if not os.path.isfile(settings_file):
            # settings file does not exist
            print('Unable to find file: {0!s}'.format(settings_file))

            # login new
            api = Client(
                username, password,
                on_login=lambda x: onlogin_callback(x, settings_file))
        else:
            with open(settings_file) as file_data:
                cached_settings = json.load(file_data, object_hook=from_json)
            print('Reusing settings: {0!s}'.format(settings_file))

            device_id = cached_settings.get('device_id')
            # reuse auth settings
            api = Client(
                username, password,
                settings=cached_settings)
        
        current_user = api.current_user()

    except (ClientCookieExpiredError, ClientLoginRequiredError) as e:
        print('ClientCookieExpiredError/ClientLoginRequiredError: {0!s}'.format(e))
        if os.path.isfile(settings_file):
            os.remove(settings_file)
        return {"status": "error", "msg": "Invalid Username or Password."}
        # Login expired
        # Do relogin but use default ua, keys and such
        # settings_file = THIS_FOLDER_G + "/db/data/cookies/" + username + "_" + _ID + ""
        # api = Client(
        #     username, password,
        #     device_id=device_id,
        #     on_login=lambda x: onlogin_callback(x, settings_file))

    except ClientLoginError as e:
        print('ClientLoginError {0!s}'.format(e))
        if os.path.isfile(settings_file):
            os.remove(settings_file)
        return {"status": "error", "msg": "Invalid Username or Password."}

    except ClientError as e:
        print('ClientError {0!s} (Code: {1:d}, Response: {2!s})'.format(e.msg, e.code, e.error_response))
        # if os.path.isfile(settings_file):
        #     os.remove(settings_file)
        return {"status": "error", "msg": e.msg}

    except Exception as e:
        print('Unexpected Exception: {0!s}'.format(e))
        return {"status": "error", "msg": "Something went wrong."}

    # Show when login expires
    cookie_expiry = api.cookie_jar.expires_earliest
    print('Cookie Expiry: {0!s}'.format(datetime.datetime.fromtimestamp(cookie_expiry).strftime('%Y-%m-%dT%H:%M:%SZ')))
    print('All ok')

    return api


# helper function to check for unfollowers
def get_unfollowers(_ID, username, following, followers):
    initial_followers = {}
    unfollowers = {"users": []}

    user_db = Users.query.filter_by(username=username).first()
    if user_db is not None:
        initial_followers = json.loads(user_db.initial_followers)

    new_follower_switch = False
    for index, follower in enumerate(followers["users"]):
        for index_2, initial_follower in enumerate(initial_followers["users"]):
            if follower["pk"] == initial_follower["pk"]:
                new_follower_switch = False
                break
            else:
                new_follower_switch = True
        if new_follower_switch is True:
            initial_followers["users"].append(followers["users"][index])
            new_follower_switch = False

    if user_db is not None:
        user_db.initial_followers = json.dumps(initial_followers)
        db.session.commit()

    unfollower_switch = False
    for index, initial_follower in enumerate(initial_followers["users"]):
        for index_2, follower in enumerate(followers["users"]):
            if initial_follower["pk"] == follower["pk"]:
                unfollower_switch = False
                break
            else:
                unfollower_switch = True
        if unfollower_switch is True:
            unfollowers["users"].append(initial_followers["users"][index])
            unfollower_switch = False

    for index, unfollower in enumerate(unfollowers["users"]):
        unfollowers["users"][index]["followed_by_you"] = False
        for index_2, followed in enumerate(following["users"]):
            if unfollower["pk"] == followed["pk"]:
                unfollowers["users"][index]["followed_by_you"] = True

    unfollowers["status"] = "ok"
    unfollowers["users"] = sorted(unfollowers["users"], key=lambda k: k['full_name'])

    return unfollowers


"""
    ENDPOINTS
"""
@app.route('/establishencryption', methods=["POST"])
def establishencryption():
    global THIS_FOLDER_G
    try:
        _N = int(request.form.get('_N'))
        _G = int(request.form.get('_G'))
        _X = int(request.form.get('_X'))
        _ID = str(request.form.get('_ID'))

        _B = randint(100, 500)
        _Y = pow(_G, _B) % (_N)

        xb = pow(_X, _B) % (_N)
        
        SEC_KEY = xb

        new_key = Keys(client_id=_ID, sec_key=str(SEC_KEY))
        db.session.add(new_key)
        db.session.commit()

        return jsonify({"status": "ok", "y": str(_Y)})

    except Exception as e:
        return jsonify({"status": "error", "msg": "Somewthing Went Wrong. Please try again."})


@app.route('/confirmkeyexchange', methods=["POST"])
def confirmkeyexchange():
    _ID = request.form.get('_ID')
    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})
        else:
            return jsonify({"status": "ok", "msg": "Secret Key Found"})
    except:
        return jsonify({"status": "error", "msg": "Somewthing Went Wrong. Please try again."})


@app.route('/login', methods=["POST"])
def login():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID, new_login=True)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id
        current_user = api.current_user()

        followers = api.user_followers(user_id)

        user_db = Users.query.filter_by(username=username).first()
        if user_db is None:
            new_user = Users(username=username, client_id_list=_ID, is_active=True, initial_followers=json.dumps(followers))
            db.session.add(new_user)
            db.session.commit()
        else:
            client_id_list = user_db.client_id_list.split(",")
            if _ID not in client_id_list:
                client_id_list.append(_ID)
            user_db.client_id_list = (",").join(client_id_list)
            db.session.commit()

        return jsonify(current_user)


@app.route('/getcurrentuser', methods=["POST"])
def getcurrentuser():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id
        current_user = api.current_user()

        followers = api.user_followers(user_id)
        following = api.user_following(user_id)
        unfollowers = get_unfollowers(_ID, username, following, followers)

        current_user["user"]["following_count"] = len(following["users"])
        current_user["user"]["followers_count"] = len(followers["users"])
        current_user["user"]["unfollowers_count"] = len(unfollowers["users"])

        return jsonify(current_user)


@app.route('/followers', methods=["POST"])
def followers():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        followers = api.user_followers(user_id)
        following = api.user_following(user_id)

        for index, follower in enumerate(followers["users"]):
            followers["users"][index]["followed_by_you"] = False
            for index_2, followed in enumerate(following["users"]):
                if follower["pk"] == followed["pk"]:
                    followers["users"][index]["followed_by_you"] = True

        followers["users"] = sorted(followers["users"], key=lambda k: k['full_name'])
        return jsonify(followers)


@app.route('/following', methods=["POST"])
def following():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        followers = api.user_followers(user_id)
        following = api.user_following(user_id)

        for index, followed in enumerate(following["users"]):
            following["users"][index]["following_you"] = False
            for index_2, follower in enumerate(followers["users"]):
                if followed["pk"] == follower["pk"]:
                    following["users"][index]["following_you"] = True

        following["users"] = sorted(following["users"], key=lambda k: k['full_name'])
        return jsonify(following)


@app.route('/unfollowers', methods=["POST"])
def unfollowers():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        followers = api.user_followers(user_id)
        following = api.user_following(user_id)

        unfollowers = get_unfollowers(_ID, username, following, followers)

        return jsonify(unfollowers)


@app.route('/followuser', methods=["POST"])
def followuser():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')
    other_user_id = request.form.get('other_user_id')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        follow_user = api.friendships_create(other_user_id)

        return jsonify(follow_user)


@app.route('/unfollowuser', methods=["POST"])
def unfollowuser():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')
    other_user_id = request.form.get('other_user_id')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        unfollow_user = api.friendships_destroy(other_user_id)

        return jsonify(unfollow_user)


@app.route('/reset', methods=["POST"])
def reset():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        user_id = api.authenticated_user_id

        followers = api.user_followers(user_id)

        user_db = Users.query.filter_by(username=username).first()
        if user_db is not None:
            user_db.initial_followers = json.dumps(followers)
            db.session.commit()

        return jsonify({"status": "ok", "msg": "Reset Successful."})


@app.route('/logout', methods=["POST"])
def logout():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        settings_file = THIS_FOLDER_G + "/db/data/cookies/" + username + "_" + _ID + ""
        if os.path.isfile(settings_file):
            os.remove(settings_file)

        client_id_list = []
        user_db = Users.query.filter_by(username=username).first()
        if user_db is not None:
            client_id_list = user_db.client_id_list.split(",")
            for index, _id_ in enumerate(client_id_list):
                if _id_ == _ID:
                    client_id_list.pop(index)
            user_db.client_id_list = (",").join(client_id_list)
            db.session.commit()
        
        keys_db = Keys.query.filter_by(client_id=_ID).first()
        if keys_db is not None:
            db.session.delete(keys_db)
            db.session.commit()

        return jsonify({"status": "ok", "msg": "Logout Successful."})


@app.route('/completelogout', methods=["POST"])
def completelogout():
    _ID = request.form.get('_ID')
    username = request.form.get('username')
    password = request.form.get('password')

    try:
        SEC_KEY = get_SEC_KEY(_ID)
        if SEC_KEY == "Not Found":
            return jsonify({"status": "error", "msg": "Secret Key Not Found"})

        password = decrypt_data(password, SEC_KEY)
    except:
        return jsonify({"status": "error", "msg": "Encryption Error."})

    api = ig_login(username, password, _ID)

    if isinstance(api, dict) and "status" in api and api["status"] == "error":
        return jsonify(api)
    else:
        client_id_list = []
        user_db = Users.query.filter_by(username=username).first()
        if user_db is not None:
            client_id_list = user_db.client_id_list.split(",")
            if _ID in client_id_list:
                for _id_ in client_id_list:
                    settings_file = THIS_FOLDER_G + "/db/data/cookies/" + username + "_" + _id_ + ""
                    if os.path.isfile(settings_file):
                        os.remove(settings_file)
                    
                    keys_db = Keys.query.filter_by(client_id=_id_).first()
                    if keys_db is not None:
                        db.session.delete(keys_db)
                        db.session.commit()

                db.session.delete(user_db)
                db.session.commit()
                return jsonify({"status": "ok", "msg": "Complete Logout Successful."})
            else:
                return jsonify({"status": "error", "msg": "Device ID ot registered with username."})
        else:
            return jsonify({"status": "error", "msg": "User not found."})


# --- Run Flask App
if __name__ == "__main__":
    db.create_all()
    app.run(debug=True)
