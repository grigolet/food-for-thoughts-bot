In = [
    {user_id: Int, preferences: Str[], location: [Float, Float]},
    {user_id: Int, preferences: Str[], location: [Float, Float]: optional},
    {user_id: Int, preferences: Str[], location: [Float, Float]},
    {user_id: Int, preferences: Str[], location: [Float, Float]},
]
Out = {
    foursquare_id,
    name,
    url,
    address,
    city
}


{
    foursquare_id: String,
    feedback: [
        {user_id: Int, reaction: '👍'},
        {user_id: Int, reaction: '👎'},
        {user_id: Int, reaction: '👉'},
    ]
}