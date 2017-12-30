# Instagram Unfollowers

Find when someone unfollows you on instagram. Make only meaningful connections instead of fake followers.

# Install

> pip install -r requirements.txt

# Run

> python app.py

## Endpoints

data should be sent in POST method

##### `domain.name/login`

> first time login to save cookies file

> receives `username` and `password` variables in formdata.

##### `domain.name/followers`

> get followers list

> receives `username` and `password` variables in formdata.

##### `domain.name/following`

> get following list

> receives `username` and `password` variables in formdata.

##### `domain.name/unfollowers`

> get unfollowers list

> receives `username` and `password` variables in formdata.

##### `domain.name/follow`

> follow a user

> receives `username`, `password` and `other_user_id` variables in formdata.

##### `domain.name/unfollow`

> unfollow a user

> receives `username`, `password` and `other_user_id` variables in formdata.

---

##### `instagram private api link`

> [https://github.com/ping/instagram_private_api](https://github.com/ping/instagram_private_api)
