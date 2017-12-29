### Imports
from flask import Flask, flash, redirect, render_template, request, session, url_for, jsonify, g
from flask_compress import Compress
import sqlalchemy
# from cs50 import SQL
from passlib.hash import sha256_crypt
import operator
import uuid
import os, sys
import codecs
import datetime
import os.path
import json
from random import randint
# from instagram_private_api import Client, ClientCompatPatch
try:
    from instagram_private_api import (
        Client, ClientError, ClientLoginError,
        ClientCookieExpiredError, ClientLoginRequiredError,
        __version__ as client_version)
except ImportError:
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from instagram_private_api import (
        Client, ClientError, ClientLoginError,
        ClientCookieExpiredError, ClientLoginRequiredError,
        __version__ as client_version)

### CS50 wrapper for SQLAlchemy
class SQL(object):
    """Wrap SQLAlchemy to provide a simple SQL API."""

    def __init__(self, url):
        """
        Create instance of sqlalchemy.engine.Engine.
        URL should be a string that indicates database dialect and connection arguments.
        http://docs.sqlalchemy.org/en/latest/core/engines.html#sqlalchemy.create_engine
        """
        try:
            self.engine = sqlalchemy.create_engine(url)
        except Exception as e:
            raise RuntimeError(e)

    def execute(self, text, *multiparams, **params):
        """
        Execute a SQL statement.
        """
        try:

            # bind parameters before statement reaches database, so that bound parameters appear in exceptions
            # http://docs.sqlalchemy.org/en/latest/core/sqlelement.html#sqlalchemy.sql.expression.text
            # https://groups.google.com/forum/#!topic/sqlalchemy/FfLwKT1yQlg
            # http://docs.sqlalchemy.org/en/latest/core/connections.html#sqlalchemy.engine.Engine.execute
            # http://docs.sqlalchemy.org/en/latest/faq/sqlexpressions.html#how-do-i-render-sql-expressions-as-strings-possibly-with-bound-parameters-inlined
            statement = sqlalchemy.text(text).bindparams(*multiparams, **params)
            result = self.engine.execute(str(statement.compile(compile_kwargs={"literal_binds": True})))

            # if SELECT (or INSERT with RETURNING), return result set as list of dict objects
            if result.returns_rows:
                rows = result.fetchall()
                return [dict(row) for row in rows]

            # if INSERT, return primary key value for a newly inserted row
            elif result.lastrowid is not None:
                return result.lastrowid

            # if DELETE or UPDATE (or INSERT without RETURNING), return number of rows matched
            else:
                return result.rowcount

        # if constraint violated, return None
        except sqlalchemy.exc.IntegrityError:
            return None

        # else raise error
        except Exception as e:
            raise RuntimeError(e)


### configure flask
app = Flask(__name__)
Compress(app)

app.secret_key = uuid.uuid4().hex

### Convert string to int type possibility confirmation
def RepresentsInt(s):
    try:
        int(s)
        return True
    except ValueError:
        return False

### configure root directory path relative to this file
THIS_FOLDER_G = ""
if getattr(sys, 'frozen', False):
    # frozen
    THIS_FOLDER_G = os.path.dirname(sys.executable)
else:
    # unfrozen
    THIS_FOLDER_G = os.path.dirname(os.path.realpath(__file__))

### configure CS50 Library to use SQLite database
# db = SQL("sqlite:///" + THIS_FOLDER_G + "/db/system.db")

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

def ig_login(username, password):
    global THIS_FOLDER_G
    device_id = None
    try:
        settings_file = THIS_FOLDER_G + "/json/settings/" + username + ""
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

    except (ClientCookieExpiredError, ClientLoginRequiredError) as e:
        print('ClientCookieExpiredError/ClientLoginRequiredError: {0!s}'.format(e))

        # Login expired
        # Do relogin but use default ua, keys and such
        settings_file = THIS_FOLDER_G + "/json/settings/" + username + ""
        api = Client(
            username, password,
            device_id=device_id,
            on_login=lambda x: onlogin_callback(x, settings_file))

    except ClientLoginError as e:
        print('ClientLoginError {0!s}'.format(e))
        return {"status": "error", "msg": "ClientLoginError"}

    except ClientError as e:
        print('ClientError {0!s} (Code: {1:d}, Response: {2!s})'.format(e.msg, e.code, e.error_response))
        return {"status": "error", "msg": "ClientError"}

    except Exception as e:
        print('Unexpected Exception: {0!s}'.format(e))
        return {"status": "error", "msg": "UnknownException"}

    # Show when login expires
    cookie_expiry = api.cookie_jar.expires_earliest
    print('Cookie Expiry: {0!s}'.format(datetime.datetime.fromtimestamp(cookie_expiry).strftime('%Y-%m-%dT%H:%M:%SZ')))

    # print('All ok')
    return api


@app.route('/login', methods=["POST"])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    api = ig_login(username, password)

    try:
        if api["status"] and api["status"] == "error":
            return jsonify(api)
    except:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        current_user = api.current_user()

        followers = api.user_followers(user_id)
        initial_followers_file = THIS_FOLDER_G + "/json/initial_followers/" + username + ".json"
        if not os.path.isfile(initial_followers_file):
            with open(initial_followers_file, 'w') as outfile:
                json.dump(followers, outfile, indent=None)
                print('SAVED: {0!s}'.format(initial_followers_file))
        else:
            pass

        return jsonify(current_user)

@app.route('/followers', methods=["POST"])
def followers():
    username = request.form.get('username')
    password = request.form.get('password')

    api = ig_login(username, password)

    try:
        if api["status"] and api["status"] == "error":
            return jsonify(api)
    except:
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
    username = request.form.get('username')
    password = request.form.get('password')

    api = ig_login(username, password)

    try:
        if api["status"] and api["status"] == "error":
            return jsonify(api)
    except:
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
    username = request.form.get('username')
    password = request.form.get('password')

    api = ig_login(username, password)

    try:
        if api["status"] and api["status"] == "error":
            return jsonify(api)
    except:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        followers = api.user_followers(user_id)
        following = api.user_following(user_id)

        initial_followers = {}
        unfollowers = {"users": []}

        initial_followers_file = THIS_FOLDER_G + "/json/initial_followers/" + username + ".json"
        if not os.path.isfile(initial_followers_file):
            with open(initial_followers_file, 'w') as outfile:
                json.dump(followers, outfile, indent=None)
                print('SAVED: {0!s}'.format(initial_followers_file))
            with open(initial_followers_file, 'r') as infile:
                initial_followers = json.load(infile)
                print('LOADED: {0!s}'.format(initial_followers_file))
        else:
            with open(initial_followers_file, 'r') as infile:
                initial_followers = json.load(infile)
                print('LOADED: {0!s}'.format(initial_followers_file))

        new_follower_switch = False
        for index, follower in enumerate(followers["users"]):
            for index_2, initial_follower in enumerate(initial_followers["users"]):
                if follower["pk"] == initial_follower["pk"]:
                    new_follower_switch = False
                    break
                else:
                    new_follower_switch = True
            if new_follower_switch == True:
                initial_followers["users"].append(followers["users"][index])
                new_follower_switch = False

        unfollower_switch = False
        for index, initial_follower in enumerate(initial_followers["users"]):
            for index_2, follower in enumerate(followers["users"]):
                if initial_follower["pk"] == follower["pk"]:
                    unfollower_switch = False
                    break
                else:
                    unfollower_switch = True
            if unfollower_switch == True:
                unfollowers["users"].append(initial_followers["users"][index])
                unfollower_switch = False

        for index, unfollower in enumerate(unfollowers["users"]):
            unfollowers["users"][index]["followed_by_you"] = False
            for index_2, followed in enumerate(following["users"]):
                if unfollower["pk"] == followed["pk"]:
                    unfollowers["users"][index]["followed_by_you"] = True

        unfollowers["status"] = "ok"
        unfollowers["users"] = sorted(unfollowers["users"], key=lambda k: k['full_name'])

        return jsonify(unfollowers)

@app.route('/followuser', methods=["POST"])
def followuser():
    username = request.form.get('username')
    password = request.form.get('password')
    other_user_id = request.form.get('other_user_id')

    api = ig_login(username, password)

    try:
        if api["status"] and api["status"] == "error":
            return jsonify(api)
    except:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        follow_user = api.friendships_create(other_user_id)

        return jsonify(follow_user)

@app.route('/unfollowuser', methods=["POST"])
def unfollowuser():
    username = request.form.get('username')
    password = request.form.get('password')
    other_user_id = request.form.get('other_user_id')

    api = ig_login(username, password)

    try:
        if api["status"] and api["status"] == "error":
            return jsonify(api)
    except:
        user_id = api.authenticated_user_id
        user_name = api.authenticated_user_name
        unfollow_user = api.friendships_destroy(other_user_id)

        return jsonify(unfollow_user)

@app.route('/establishencryption', methods=["POST"])
def establishencryption():
    global THIS_FOLDER_G
    try:
        _N = int(request.form.get('_N'))
        _G = int(request.form.get('_G'))
        _X = int(request.form.get('_X'))
        _ID = str(request.form.get('_ID'))

        _B = randint(100, 500);
        _Y = pow(_G, _B) % (_N);

        xb = pow(_X, _B) % (_N);
        
        SEC_KEY = xb
        
        print(_ID)
        print(SEC_KEY)

        DB_ENTRY = {_ID: SEC_KEY}
        DB_PATH = THIS_FOLDER_G + "/db/__keys__.json"
        
        with open(DB_PATH, 'r') as infile:
            DB_ENTRIES = json.load(infile)
        
        DB_ENTRIES[_ID] = str(SEC_KEY)
        
        with open(DB_PATH, 'w') as outfile:
            json.dump(DB_ENTRIES, outfile, indent=2)

        return jsonify({"status": "ok", "y": str(_Y)})

    except Exception as e:
        return jsonify({"status": "error", "msg": "Somewthing Went Wrong. Please try again."})



# __TODO__ update and replace saved data with new data

# __TODO__ clear my data / logout completely


### Run Flask App
if __name__ == "__main__":
    app.run(debug=True)
