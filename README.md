# instagram_unfollow_check
instagram_unfollow_check

## Endpoints
data should be sent in POST method

##### `domain.name/login`

> first time login to save cookies file

> recieves `username` and `password` variables in formdata.

##### `domain.name/followers`

> get followers list

> recieves `username` and `password` variables in formdata.

##### `domain.name/following`

> get following list

> recieves `username` and `password` variables in formdata.

##### `domain.name/unfollowers`

> get unfollowers list

> recieves `username` and `password` variables in formdata.

##### `domain.name/follow`

> follow a user

> recieves `username`, `password` and `other_user_id` variables in formdata.

##### `domain.name/unfollow`

> unfollow a user

> recieves `username`, `password` and `other_user_id` variables in formdata.

---

##### `instagram private api link`

> [https://github.com/ping/instagram_private_api](https://github.com/ping/instagram_private_api)