# food-for-thoughts-bot
Bot running food for thoughts service.

Food for thoughts is a bot telegram aiming at helping people
choosing a restaurant together.

This bot is a prototype and a proof of concept realized for the 
[Junction 2020](https://app.hackjunction.com/events/junction-2020-connected) hackathon

This service uses a dataset of Geneva restaurants extracted and
loaded from Foursquare apis into an aito.ai instance.

The bot calls to aito apis to search for restaurants. The query tries to optimize
different factors. In particular:
* Position sent by the users
* Users' general tastes
* Users' restaurants preferences

# External components
Some external services are used for this project
* An instance created at https://aito.ai/
* A registered telegram bot
* A local server
