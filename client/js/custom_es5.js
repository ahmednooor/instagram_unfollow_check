var REST_Endpoints = {
    establishencryption: "http://127.0.0.1:5000/establishencryption",
    confirmkeyexchange: "http://127.0.0.1:5000/confirmkeyexchange",
    login: "http://127.0.0.1:5000/login",
    getcurrentuser: "http://127.0.0.1:5000/getcurrentuser",
    followers: "http://127.0.0.1:5000/followers",
    unfollowers: "http://127.0.0.1:5000/unfollowers",
    following: "http://127.0.0.1:5000/following",
    followuser: "http://127.0.0.1:5000/followuser",
    unfollowuser: "http://127.0.0.1:5000/unfollowuser",
    reset: "http://127.0.0.1:5000/reset",
    logout: "http://127.0.0.1:5000/logout",
    completelogout: "http://127.0.0.1:5000/completelogout"
};

window.onload = lifeCycle;

function lifeCycle() {
    if (!localStorage.getItem("_ID") || !localStorage.getItem("SEC_KEY")) {
        generate_exchange_DH_key(REST_Endpoints.establishencryption);
    } else if (localStorage.getItem("_ID")) {
        confirmKeyExchange();
    }

    if (!localStorage.getItem("_USERNAME") || !localStorage.getItem("_PASSWORD") || !localStorage.getItem("_CURRENT_USER")) {
        askForLogin();
    }

    if (localStorage.getItem("_ID") && localStorage.getItem("SEC_KEY") && localStorage.getItem("_USERNAME") && localStorage.getItem("_PASSWORD")) {
        updateCurrentUser();
        // getFollowing();
        // getFollowers();
        // getUnfollowers();
    }
    bindEventsToMenuBtns();
}

function bindEventsToMenuBtns() {
    var menuButtons = document.getElementById("curUserFollowerInfo").getElementsByTagName("button");
    function bindEmAll() {
        var menuButton = this;
        clearUserListsSections();
        for (var j = 0; j < menuButtons.length; j++) {
            menuButtons[j].classList.remove("active");
        }
        menuButton.classList.add("active");
        if (menuButton.getAttribute("id") == "followingInfoButton") {
            getFollowing();
        } else if (menuButton.getAttribute("id") == "followersInfoButton") {
            getFollowers();
        } else if (menuButton.getAttribute("id") == "unfollowersInfoButton") {
            getUnfollowers();
        } else if (menuButton.getAttribute("id") == "settingsInfoButton") {
            loadSettings();
        }
    }
    for (var i = 0; i < menuButtons.length; i++) {
        menuButtons[i].onclick = bindEmAll;
    }
}

function clearUserListsSections() {
    var main_content_containers = document.getElementsByClassName("main_content_container");
    for (var i = 0; i < main_content_containers.length; i++) {
        var list_container = main_content_containers[i].getElementsByClassName("row")[0];
        removeLoader(main_content_containers[i].getAttribute("id"));
        list_container.innerHTML = "";
        main_content_containers[i].style.display = "none";
    }
}

function loadSettings() {
    var settingsListContainer = document.getElementById("settingsListContainer");
    var settingsListContainerRow = settingsListContainer.getElementsByClassName("settingsListContainerRow")[0];
    settingsListContainer.style.display = "";

    var settingsTemplate = "\n    <div class=\"col-md-12\">\n        <div class=\"user_container\">\n            <div class=\"reset_settings_container\">\n                <button class=\"resetButton settings_button\" id=\"resetButton\">Reset Unfollowers</button>\n                <p class=\"settings_text\">Resets unfollowers list.</p>\n            </div>\n        </div>\n    </div>\n    <div class=\"col-md-12\">\n        <div class=\"user_container\">\n            <div class=\"reset_settings_container\">\n                <button class=\"logoutButton settings_button\" id=\"logoutButton\">Logout</button>\n                <p class=\"settings_text\">Logs you out from this device.</p>\n            </div>\n        </div>\n    </div>\n    <div class=\"col-md-12\">\n        <div class=\"user_container\">\n            <div class=\"reset_settings_container\">\n                <button class=\"completeLogoutButton settings_button\" id=\"completeLogoutButton\">Logout and Delete Data</button>\n                <p class=\"settings_text\">Logs you out from every device and deletes your cookie and unfollowers data.<br>NOTE: This only deletes the data from our server and not from your Instagram Account.</p>\n            </div>\n        </div>\n    </div>\n    ";
    settingsListContainerRow.innerHTML = settingsTemplate;

    var resetButton = document.getElementById("resetButton");
    resetButton.onclick = function () {
        var data = new FormData();
        data.append('username', localStorage.getItem("_USERNAME"));
        data.append('password', localStorage.getItem("_PASSWORD"));
        data.append('_ID', localStorage.getItem("_ID"));

        var xhr = new XMLHttpRequest();

        xhr.open('POST', REST_Endpoints.reset, true);
        xhr.onload = function () {
            var response = JSON.parse(this.responseText);

            removeLoader("unfollowersListContainer");

            if (response.status != "ok") {
                if (response.msg == "New User.") {
                    console.log(response.msg);
                    localStorage.removeItem("_USERNAME");
                    localStorage.removeItem("_PASSWORD");
                    localStorage.removeItem("_CURRENT_USER");
                    window.location.reload(true);
                }
                if (response.msg == "Invalid Username or Password.") {
                    askForLogin();
                }
            } else {
                console.log(response.msg);
            }
        };
        xhr.send(data);
    };
    var logoutButton = document.getElementById("logoutButton");
    logoutButton.onclick = function () {
        var data = new FormData();
        data.append('username', localStorage.getItem("_USERNAME"));
        data.append('password', localStorage.getItem("_PASSWORD"));
        data.append('_ID', localStorage.getItem("_ID"));

        var xhr = new XMLHttpRequest();

        xhr.open('POST', REST_Endpoints.logout, true);
        xhr.onload = function () {
            var response = JSON.parse(this.responseText);

            removeLoader("unfollowersListContainer");

            if (response.status != "ok") {
                if (response.msg == "New User.") {
                    console.log(response.msg);
                    localStorage.removeItem("_USERNAME");
                    localStorage.removeItem("_PASSWORD");
                    localStorage.removeItem("_CURRENT_USER");
                    localStorage.removeItem("_ID");
                    localStorage.removeItem("SEC_KEY");
                    window.location.reload(true);
                }
                if (response.msg == "Invalid Username or Password.") {
                    askForLogin();
                }
            } else {
                console.log(response.msg);
                localStorage.removeItem("_USERNAME");
                localStorage.removeItem("_PASSWORD");
                localStorage.removeItem("_CURRENT_USER");
                localStorage.removeItem("_ID");
                localStorage.removeItem("SEC_KEY");
                window.location.reload(true);
            }
        };
        xhr.send(data);
    };
    var completeLogoutButton = document.getElementById("completeLogoutButton");
    completeLogoutButton.onclick = function () {
        var data = new FormData();
        data.append('username', localStorage.getItem("_USERNAME"));
        data.append('password', localStorage.getItem("_PASSWORD"));
        data.append('_ID', localStorage.getItem("_ID"));

        var xhr = new XMLHttpRequest();

        xhr.open('POST', REST_Endpoints.completelogout, true);
        xhr.onload = function () {
            var response = JSON.parse(this.responseText);

            removeLoader("unfollowersListContainer");

            if (response.status != "ok") {
                if (response.msg == "New User.") {
                    console.log(response.msg);
                    localStorage.removeItem("_USERNAME");
                    localStorage.removeItem("_PASSWORD");
                    localStorage.removeItem("_CURRENT_USER");
                    localStorage.removeItem("_ID");
                    localStorage.removeItem("SEC_KEY");
                    window.location.reload(true);
                }
                if (response.msg == "Invalid Username or Password.") {
                    askForLogin();
                }
            } else {
                console.log(response.msg);
                localStorage.removeItem("_USERNAME");
                localStorage.removeItem("_PASSWORD");
                localStorage.removeItem("_CURRENT_USER");
                localStorage.removeItem("_ID");
                localStorage.removeItem("SEC_KEY");
                window.location.reload(true);
            }
        };
        xhr.send(data);
    };
}

function fillUserUnfollowers(unfollowers) {
    var unfollowersListContainer = document.getElementById("unfollowersListContainer");
    var unfollowersListContainerRow = unfollowersListContainer.getElementsByClassName("unfollowersListContainerRow")[0];

    var unfollowersLength = unfollowers.length;
    for (var i = 0; i < unfollowersLength; i++) {
        var unfollower = unfollowers[i];

        var followed_by_you = unfollower.followed_by_you == true ? "Unfollow" : "Follow";

        var buttonTemplate = "";
        if (unfollower.followed_by_you == true) {
            buttonTemplate = "<button class=\"user_follow_button unfollow\" data-id=\"" + unfollower.pk + "\" onclick=\"unfollowUser(" + unfollower.pk + ")\">Unfollow</button>";
        } else {
            buttonTemplate = "<button class=\"user_follow_button follow\" data-id=\"" + unfollower.pk + "\" onclick=\"followUser(" + unfollower.pk + ")\">Follow</button>";
        }

        var template = "\n        <div class=\"col-md-6\" id=\"" + unfollower.pk + "\">\n            <div class=\"user_container\">\n                <div class=\"user_img_container\">\n                    <img src=\"" + unfollower.profile_pic_url + "\" alt=\"\">\n                </div>\n                <div class=\"user_info_container\">\n                    <p class=\"user_full_name\">" + unfollower.full_name + "</p>\n                    <p class=\"user_username\">" + unfollower.username + "</p>\n                </div>\n                <div class=\"user_action_container\">\n                    " + buttonTemplate + "\n                </div>\n            </div>\n        </div>\n        ";
        unfollowersListContainerRow.innerHTML += template;
    }
}

function getUnfollowers() {
    clearUserListsSections();
    var unfollowersListContainer = document.getElementById("unfollowersListContainer");
    unfollowersListContainer.style.display = "";
    appendLoader("unfollowersListContainer");

    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));

    var xhr = new XMLHttpRequest();

    xhr.open('POST', REST_Endpoints.unfollowers, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        removeLoader("unfollowersListContainer");

        if (response.status != "ok") {
            if (response.msg == "New User.") {
                console.log(response.msg);
                localStorage.removeItem("_USERNAME");
                localStorage.removeItem("_PASSWORD");
                localStorage.removeItem("_CURRENT_USER");
                window.location.reload(true);
            }
            if (response.msg == "Invalid Username or Password.") {
                askForLogin();
            }
        } else {
            fillUserUnfollowers(response.users);
        }
    };
    xhr.send(data);
}

function fillUserFollowers(followers) {
    var followersListContainer = document.getElementById("followersListContainer");
    var followersListContainerRow = followersListContainer.getElementsByClassName("followersListContainerRow")[0];

    var followersLength = followers.length;
    for (var i = 0; i < followersLength; i++) {
        var follower = followers[i];

        var followed_by_you = follower.followed_by_you == true ? "Unfollow" : "Follow";

        var buttonTemplate = "";
        if (follower.followed_by_you == true) {
            buttonTemplate = "<button class=\"user_follow_button unfollow\" data-id=\"" + follower.pk + "\" onclick=\"unfollowUser(" + follower.pk + ")\">Unfollow</button>";
        } else {
            buttonTemplate = "<button class=\"user_follow_button follow\" data-id=\"" + follower.pk + "\" onclick=\"followUser(" + follower.pk + ")\">Follow</button>";
        }

        var template = "\n        <div class=\"col-md-6\" id=\"" + follower.pk + "\">\n            <div class=\"user_container\">\n                <div class=\"user_img_container\">\n                    <img src=\"" + follower.profile_pic_url + "\" alt=\"\">\n                </div>\n                <div class=\"user_info_container\">\n                    <p class=\"user_full_name\">" + follower.full_name + "</p>\n                    <p class=\"user_username\">" + follower.username + "</p>\n                </div>\n                <div class=\"user_action_container\">\n                    " + buttonTemplate + "\n                </div>\n            </div>\n        </div>\n        ";
        followersListContainerRow.innerHTML += template;
    }
}

function getFollowers() {
    clearUserListsSections();
    var followersListContainer = document.getElementById("followersListContainer");
    followersListContainer.style.display = "";
    appendLoader("followersListContainer");

    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));

    var xhr = new XMLHttpRequest();

    xhr.open('POST', REST_Endpoints.followers, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        removeLoader("followersListContainer");

        if (response.status != "ok") {
            if (response.msg == "New User.") {
                console.log(response.msg);
                localStorage.removeItem("_USERNAME");
                localStorage.removeItem("_PASSWORD");
                localStorage.removeItem("_CURRENT_USER");
                window.location.reload(true);
            }
            if (response.msg == "Invalid Username or Password.") {
                askForLogin();
            }
        } else {
            fillUserFollowers(response.users);
        }
    };
    xhr.send(data);
}

function fillUserFollowing(following) {
    var followingListContainer = document.getElementById("followingListContainer");
    var followingListContainerRow = followingListContainer.getElementsByClassName("followingListContainerRow")[0];

    var followingLength = following.length;
    for (var i = 0; i < followingLength; i++) {
        var followed = following[i];
        var following_you = followed.following_you == true ? "- Following You" : "";
        var template = "\n        <div class=\"col-md-6\" id=\"" + followed.pk + "\">\n            <div class=\"user_container\">\n                <div class=\"user_img_container\">\n                    <img src=\"" + followed.profile_pic_url + "\" alt=\"\">\n                </div>\n                <div class=\"user_info_container\">\n                    <p class=\"user_full_name\">" + followed.full_name + " <span class=\"user_following_you\">" + following_you + "</span></p>\n                    <p class=\"user_username\">" + followed.username + "</p>\n                </div>\n                <div class=\"user_action_container\">\n                    <button class=\"user_follow_button unfollow\" data-id=\"" + followed.pk + "\" onclick=\"unfollowUser(" + followed.pk + ")\">Unfollow</button>\n                </div>\n            </div>\n        </div>\n        ";
        followingListContainerRow.innerHTML += template;
    }
}

function getFollowing() {
    clearUserListsSections();
    var followingListContainer = document.getElementById("followingListContainer");
    followingListContainer.style.display = "";
    appendLoader("followingListContainer");

    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));

    var xhr = new XMLHttpRequest();

    xhr.open('POST', REST_Endpoints.following, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        removeLoader("followingListContainer");

        if (response.status != "ok") {
            if (response.msg == "New User.") {
                console.log(response.msg);
                localStorage.removeItem("_USERNAME");
                localStorage.removeItem("_PASSWORD");
                localStorage.removeItem("_CURRENT_USER");
                window.location.reload(true);
            }
            if (response.msg == "Invalid Username or Password.") {
                askForLogin();
            }
        } else {
            fillUserFollowing(response.users);
        }
    };
    xhr.send(data);
}

function fillCurrentUserProfile() {
    var curUserProfileImg = document.getElementById("curUserProfileImg");
    var curUserFullName = document.getElementById("curUserFullName");
    var curUserUsername = document.getElementById("curUserUsername");

    var followingInfoButton = document.getElementById("followingInfoButton");
    var followersInfoButton = document.getElementById("followersInfoButton");
    var unfollowersInfoButton = document.getElementById("unfollowersInfoButton");

    var Cur_User_Data = JSON.parse(localStorage.getItem("_CURRENT_USER"));

    curUserProfileImg.src = Cur_User_Data.profile_pic_url;
    curUserFullName.innerHTML = "<a href=\"index.html\">" + Cur_User_Data.full_name + "</a>";
    curUserUsername.innerText = Cur_User_Data.username;

    followingInfoButton.innerText = "Following (" + Cur_User_Data.following_count + ")";
    followersInfoButton.innerText = "Followers (" + Cur_User_Data.followers_count + ")";
    unfollowersInfoButton.innerText = "Unfollowers (" + Cur_User_Data.unfollowers_count + ")";
}

function updateCurrentUser() {
    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));

    var loaderMainOverlay = document.getElementById("loaderMainOverlay");
    loaderMainOverlay.style.display = "block";

    var xhr = new XMLHttpRequest();

    xhr.open('POST', REST_Endpoints.getcurrentuser, true);
    xhr.onload = function () {
        loaderMainOverlay.style.display = "";

        var response = JSON.parse(this.responseText);

        if (response.status != "ok") {
            if (response.msg == "New User.") {
                console.log(response.msg);
                localStorage.removeItem("_USERNAME");
                localStorage.removeItem("_PASSWORD");
                localStorage.removeItem("_CURRENT_USER");
                window.location.reload(true);
            }
            if (response.msg == "Invalid Username or Password.") {
                askForLogin();
            }
        } else {
            localStorage.setItem("_CURRENT_USER", JSON.stringify(response.user));
            getFollowing();
            fillCurrentUserProfile();
        }
    };
    xhr.send(data);
}

function unfollowUser(other_user_id) {
    var button = document.getElementById(other_user_id).getElementsByClassName("user_follow_button")[0];
    button.innerText = "...";

    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));
    data.append('other_user_id', other_user_id);

    var xhr = new XMLHttpRequest();

    xhr.open('POST', REST_Endpoints.unfollowuser, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        if (response.status != "ok") {
            // askForLogin();
            button.innerText = "Unfollow";
        } else {
            button.classList.remove("unfollow");
            button.classList.add("follow");
            button.innerText = "Follow";
            button.setAttribute("onclick", "followUser(" + other_user_id + ")");
        }
    };
    xhr.send(data);
}

function followUser(other_user_id) {
    var button = document.getElementById(other_user_id).getElementsByClassName("user_follow_button")[0];
    button.innerText = "...";

    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));
    data.append('other_user_id', other_user_id);

    var xhr = new XMLHttpRequest();

    xhr.open('POST', REST_Endpoints.followuser, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        if (response.status != "ok") {
            // askForLogin();
            button.innerText = "Follow";
        } else {
            button.classList.remove("follow");
            button.classList.add("unfollow");
            button.innerText = "Unfollow";
            button.setAttribute("onclick", "unfollowUser(" + other_user_id + ")");
        }
    };
    xhr.send(data);
}

function removeLoader(id) {
    document.getElementById(id).getElementsByClassName("row")[0].innerHTML = "";
}

function appendLoader(id) {
    var loaderTeemplate = "\n    <div class=\"loader\">\n        <svg>\n            <defs>\n            <filter id=\"goo\">\n                <feGaussianBlur in=\"SourceGraphic\" stdDeviation=\"1\" result=\"blur\" />\n                <feColorMatrix in=\"blur\" mode=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 4 -2\" result=\"gooey\" />\n                <feComposite in=\"SourceGraphic\" in2=\"gooey\" operator=\"atop\"/>\n            </filter>\n            </defs>\n        </svg>\n    </div>";
    document.getElementById(id).style.display = "";
    document.getElementById(id).getElementsByClassName("row")[0].innerHTML = loaderTeemplate;
}

function askForLogin() {
    var loginFormOverlay = document.getElementById("loginFormOverlay");
    loginFormOverlay.style.display = "block";

    var login_submit_button = document.getElementById("login_submit_button");

    login_submit_button.onclick = function () {
        login_submit_button.innerText = "...";

        var login_username = document.getElementById("login_username").value;
        var login_password = document.getElementById("login_password").value;
        login_password = encrypt_data(login_password, localStorage.getItem("SEC_KEY"));

        var data = new FormData();
        data.append('username', login_username);
        data.append('password', login_password);
        data.append('_ID', localStorage.getItem("_ID"));

        var xhr = new XMLHttpRequest();

        xhr.open('POST', REST_Endpoints.login, true);
        xhr.onload = function () {
            login_submit_button.innerText = "Login";
            var response = JSON.parse(this.responseText);
            if (response.status != "ok") {
                document.getElementById("loginFormStatus").innerHTML = response.msg;
            } else {
                localStorage.setItem("_USERNAME", response.user.username);
                localStorage.setItem("_PASSWORD", login_password);
                localStorage.setItem("_CURRENT_USER", JSON.stringify(response.user));
                document.getElementById("loginFormStatus").innerHTML = "";
                loginFormOverlay.style.display = "";
                lifeCycle();
            }
        };
        xhr.send(data);
    };
}

function confirmKeyExchange() {
    var data = new FormData();
    data.append('_ID', localStorage.getItem("_ID"));

    var xhr = new XMLHttpRequest();

    xhr.open('POST', REST_Endpoints.confirmkeyexchange, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        if (response.status != "ok") {
            console.log(response.msg);
            generate_exchange_DH_key(REST_Endpoints.establishencryption);
        } else {
            console.log(response.msg);
        }
    };
    xhr.send(data);
}

// -----------------------------------
// --- helper functions from internet
// -----------------------------------
function generate_exchange_DH_key(_URL) {
    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    }

    var PrimeFinder = function () {
        var PRIMES = [];
        var MAX_RANGE = 10000;

        function _generatePrimes() {
            // Computing 10000 is not much different than computing 500, so fill the entire array.
            var marks = Array(MAX_RANGE + 1).fill(false);
            for (var i = 2; i <= MAX_RANGE; i++) {
                // Already marked as non-prime?
                if (marks[i]) continue;
                // Mark all multiples
                for (var j = i * 2; j <= MAX_RANGE; j += i) {
                    marks[j] = true;
                }
                // This number hasn't been marked, and therefore is prime
                PRIMES.push(i);
            }
        }

        function isPrime(n) {
            if (Number.isNaN(n)) throw Error('n must be a number');
            if (n > MAX_RANGE || n < 0) throw Error('n is out of range.');
            if (!PRIMES.length) _generatePrimes();
            // Could be sped up with a binary search.
            return PRIMES.includes(n);
        }

        function findPrimes(upperBound) {
            if (Number.isNaN(upperBound)) throw Error('upperBound must be a number');
            if (upperBound > MAX_RANGE) throw Error("upperBound must be less than " + MAX_RANGE);
            if (upperBound < 0) throw Error('upperBound must be at least 0');

            if (!PRIMES.length) _generatePrimes();

            var index = PRIMES.findIndex(function (n) {
                return n > upperBound;
            });
            // Return a copy of the array so users can't mess with the module
            return index == -1 ? [].concat(PRIMES) : PRIMES.slice(0, index);
        }

        return { isPrime: isPrime, findPrimes: findPrimes };
    }();

    var listOfRsaNums = ["3347807169895689878604416984821269081770479498371376856891", "2431388982883793878002287614711652531743087737814467999489", "3674604366679959042824463379962795263227915816434308764267", "6032283815739666511279233373417143396810270092798736308917"];

    var randomPrime = parseInt(Math.random() * 100);
    while (true) {
        if (randomPrime > 2) break;else randomPrime = parseInt(Math.random() * 100);
    }
    randomPrime = PrimeFinder.findPrimes(randomPrime);
    randomPrime = randomPrime.pop();

    var _ID = uuidv4();

    var _N = bigInt(listOfRsaNums[parseInt(Math.random() * 4)], 10);
    var _G = randomPrime;
    var _A = parseInt(Math.random() * 500);
    while (true) {
        if (_A > 100) break;else _A = parseInt(Math.random() * 100);
    }
    var _X = bigInt(_G).pow(_A).mod(_N);

    var SEC_KEY = "";

    var data = new FormData();
    data.append('_N', _N.toString(10));
    data.append('_G', _G.toString(10));
    data.append('_X', _X.toString(10));
    data.append('_ID', _ID);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', _URL, true);
    xhr.onload = function () {
        var y = JSON.parse(this.responseText);
        y = y.y;
        y = bigInt(y);
        var ya = y.pow(_A).mod(_N);
        SEC_KEY = ya.toString(10);

        localStorage.setItem("_ID", _ID);
        localStorage.setItem("SEC_KEY", SEC_KEY);
    };
    xhr.send(data);
}
function encrypt_data(_text, _password) {
    var data = _text;
    var password = _password;
    var ctObj = CryptoJS.AES.encrypt(data, password);
    var ctStr = ctObj.toString();
    return ctStr;
}