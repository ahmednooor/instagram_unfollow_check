
var REST_Endpoints = {
    establishencryption: "http://127.0.0.1:5000/establishencryption",
    confirmkeyexchange: "http://127.0.0.1:5000/confirmkeyexchange",
    login: "http://127.0.0.1:5000/login",
    followers: "http://127.0.0.1:5000/followers",
    unfollowers: "http://127.0.0.1:5000/unfollowers",
    following: "http://127.0.0.1:5000/following",
    followuser: "http://127.0.0.1:5000/followuser",
    unfollowuser: "http://127.0.0.1:5000/unfollowuser"
};

window.onload = lifeCycle;

function lifeCycle() {
    if (!localStorage.getItem("_ID") ||
        !localStorage.getItem("SEC_KEY")
    ) {
        generate_exchange_DH_key(REST_Endpoints.establishencryption);

    } else if (localStorage.getItem("_ID")) {
        confirmKeyExchange();
    }

    if (!localStorage.getItem("_USERNAME") || 
        !localStorage.getItem("_PASSWORD") ||
        !localStorage.getItem("_CURRENT_USER")
    ) {
        askForLogin();
    }
    
    if (localStorage.getItem("_ID") &&
        localStorage.getItem("SEC_KEY") &&
        localStorage.getItem("_USERNAME") && 
        localStorage.getItem("_PASSWORD")
    ) {
        updateCurrentUser();
        getFollowing();
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
            
        }
    }
    for (var i = 0; i < menuButtons.length; i++) {
        menuButtons[i].onclick = bindEmAll;
    }
}

function clearUserListsSections() {
    var users_list_containers = document.getElementsByClassName("users_list_container");
    for (var i = 0; i < users_list_containers.length; i++) {
        var list_container = users_list_containers[i].getElementsByClassName("row")[0];
        list_container.innerHTML = "";
    }
}

function fillUserUnfollowers(unfollowers) {
    var unfollowersListContainer = document.getElementById("unfollowersListContainer");
    var unfollowersListContainerRow = unfollowersListContainer.getElementsByClassName("unfollowersListContainerRow")[0];

    var unfollowersLength = unfollowers.length;
    for (var i = 0; i < unfollowersLength; i++) {
        var unfollower = unfollowers[i];
        
        var followed_by_you = unfollower.followed_by_you == true ? "Unfollow" : "Follow";
        
        var buttonTemplate = ``;
        if (unfollower.followed_by_you == true) {
            buttonTemplate = `<button class="user_follow_button unfollow" data-id="${unfollower.pk}" onclick="unfollowUser(${unfollower.pk})">Unfollow</button>`;
        } else {
            buttonTemplate = `<button class="user_follow_button follow" data-id="${unfollower.pk}" onclick="followUser(${unfollower.pk})">Follow</button>`;
        }
        
        var template = `
        <div class="col-md-6" id="${unfollower.pk}">
            <div class="user_container">
                <div class="user_img_container">
                    <img src="${unfollower.profile_pic_url}" alt="">
                </div>
                <div class="user_info_container">
                    <p class="user_full_name">${unfollower.full_name}</p>
                    <p class="user_username">${unfollower.username}</p>
                </div>
                <div class="user_action_container">
                    ${buttonTemplate}
                </div>
            </div>
        </div>
        `;
        unfollowersListContainerRow.innerHTML += template;
    }
}

function getUnfollowers() {
    appendLoader("unfollowersListContainerRow");

    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));
    
    var xhr = new XMLHttpRequest();
    
    xhr.open('POST', REST_Endpoints.unfollowers, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        removeLoader("unfollowersListContainerRow");
        
        if (response.status != "ok") {
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
        
        var buttonTemplate = ``;
        if (follower.followed_by_you == true) {
            buttonTemplate = `<button class="user_follow_button unfollow" data-id="${follower.pk}" onclick="unfollowUser(${follower.pk})">Unfollow</button>`;
        } else {
            buttonTemplate = `<button class="user_follow_button follow" data-id="${follower.pk}" onclick="followUser(${follower.pk})">Follow</button>`;
        }
        
        var template = `
        <div class="col-md-6" id="${follower.pk}">
            <div class="user_container">
                <div class="user_img_container">
                    <img src="${follower.profile_pic_url}" alt="">
                </div>
                <div class="user_info_container">
                    <p class="user_full_name">${follower.full_name}</p>
                    <p class="user_username">${follower.username}</p>
                </div>
                <div class="user_action_container">
                    ${buttonTemplate}
                </div>
            </div>
        </div>
        `;
        followersListContainerRow.innerHTML += template;
    }
}

function getFollowers() {
    appendLoader("followersListContainerRow");
    
    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));
    
    var xhr = new XMLHttpRequest();
    
    xhr.open('POST', REST_Endpoints.followers, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);
        
        removeLoader("followersListContainerRow");

        if (response.status != "ok") {
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
        var template = `
        <div class="col-md-6" id="${followed.pk}">
            <div class="user_container">
                <div class="user_img_container">
                    <img src="${followed.profile_pic_url}" alt="">
                </div>
                <div class="user_info_container">
                    <p class="user_full_name">${followed.full_name} <span class="user_following_you">${following_you}</span></p>
                    <p class="user_username">${followed.username}</p>
                </div>
                <div class="user_action_container">
                    <button class="user_follow_button unfollow" data-id="${followed.pk}" onclick="unfollowUser(${followed.pk})">Unfollow</button>
                </div>
            </div>
        </div>
        `;
        followingListContainerRow.innerHTML += template;
    }
}

function getFollowing() {
    appendLoader("followingListContainerRow");
    
    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));
    
    var xhr = new XMLHttpRequest();
    
    xhr.open('POST', REST_Endpoints.following, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);

        removeLoader("followingListContainerRow");
        
        if (response.status != "ok") {
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
    var Cur_User_Data = JSON.parse(localStorage.getItem("_CURRENT_USER"));

    curUserProfileImg.src = Cur_User_Data.profile_pic_url;
    curUserFullName.innerHTML = `<a href="index.html">${Cur_User_Data.full_name}</a>`;
    curUserUsername.innerText = Cur_User_Data.username;
}

function updateCurrentUser() {
    var data = new FormData();
    data.append('username', localStorage.getItem("_USERNAME"));
    data.append('password', localStorage.getItem("_PASSWORD"));
    data.append('_ID', localStorage.getItem("_ID"));
    
    var xhr = new XMLHttpRequest();
    
    xhr.open('POST', REST_Endpoints.login, true);
    xhr.onload = function () {
        var response = JSON.parse(this.responseText);
        
        if (response.status != "ok") {
            if (response.msg == "Invalid Username or Password.") {
                askForLogin();
            }
        } else {
            localStorage.setItem("_CURRENT_USER", JSON.stringify(response.user));
            fillCurrentUserProfile();
        }
    };
    xhr.send(data);
}

function unfollowUser(other_user_id){
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
        } else {
            var button = document.getElementById(other_user_id).getElementsByClassName("user_follow_button")[0];
            button.classList.remove("unfollow");
            button.classList.add("follow");
            button.innerText = "Follow";
            button.setAttribute("onclick", "followUser(" + other_user_id + ")");
        }
    };
    xhr.send(data);
}

function followUser(other_user_id){
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
        } else {
            var button = document.getElementById(other_user_id).getElementsByClassName("user_follow_button")[0];
            button.classList.remove("follow");
            button.classList.add("unfollow");
            button.innerText = "Unfollow";
            button.setAttribute("onclick", "unfollowUser(" + other_user_id + ")");
        }
    };
    xhr.send(data);
}

function removeLoader(id) {
    document.getElementById(id).innerHTML = "";
}

function appendLoader(id) {
    var loaderTeemplate = `
    <div class="loader">
        <svg>
            <defs>
            <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 4 -2" result="gooey" />
                <feComposite in="SourceGraphic" in2="gooey" operator="atop"/>
            </filter>
            </defs>
        </svg>
    </div>`;
    
    document.getElementById(id).innerHTML = loaderTeemplate;
}

function askForLogin() {
    var loginFormOverlay = document.getElementById("loginFormOverlay");
    loginFormOverlay.style.display = "block";
    
    var login_submit_button = document.getElementById("login_submit_button");
    
    login_submit_button.onclick = function() {

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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var PrimeFinder = (function() {
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
            if (upperBound > MAX_RANGE) throw Error(`upperBound must be less than ${MAX_RANGE}`);
            if (upperBound < 0) throw Error('upperBound must be at least 0');

            if (!PRIMES.length) _generatePrimes();

            var index = PRIMES.findIndex(n => n > upperBound);
            // Return a copy of the array so users can't mess with the module
            return index == -1 ? [...PRIMES] : PRIMES.slice(0, index);
        }

        return { isPrime, findPrimes };
    }());

    var listOfRsaNums = [
        "3347807169895689878604416984821269081770479498371376856891",
        "2431388982883793878002287614711652531743087737814467999489",
        "3674604366679959042824463379962795263227915816434308764267",
        "6032283815739666511279233373417143396810270092798736308917"
    ];

    var randomPrime = parseInt(Math.random() * 100);
    while (true) {
        if (randomPrime > 2)
            break;
        else
            randomPrime = parseInt(Math.random() * 100);
    }
    randomPrime = PrimeFinder.findPrimes(randomPrime);
    randomPrime = randomPrime.pop();

    var _ID = uuidv4();

    var _N = bigInt(listOfRsaNums[parseInt(Math.random() * 4)], 10);
    var _G = randomPrime;
    var _A = parseInt(Math.random() * 500);
    while (true) {
        if (_A > 100)
            break;
        else
            _A = parseInt(Math.random() * 100);
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
        
        if (!localStorage.getItem("_ID") || !localStorage.getItem("SEC_KEY")) {
            localStorage.setItem("_ID", _ID);
            localStorage.setItem("SEC_KEY", SEC_KEY);
        }
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
