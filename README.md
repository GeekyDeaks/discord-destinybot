# DestinyBot
Discord Destiny Bot


## Installation

1. Install [node.js](https://nodejs.org/en/download/)
2. Clone this repo

        $ git clone https://github.com/GeekyDeaks/discord-destinybot.git

3. Download the required node modules from NPM

        $ cd discord-destinyboy
        $ npm install

4. Create the config.js

        $ cp config_template.js config.js

5. Get your bungie APIKEY from 
    [https://www.bungie.net/en/User/API](https://www.bungie.net/en/User/API)
    and save it under `config.destiny.apikey`

6. Add the app to your discord account [https://discordapp.com/developers/applications/me](https://discordapp.com/developers/applications/me)

7. Create a user for the app and copy the token to `config.discord.token`

8. Using the Client ID found in App Details, 
   create an invite link in the following format 
   
        https://discordapp.com/oauth2/authorize?scope=bot&client_id=CLIENT_ID

9. Start the bot

        node destinybot.js

## TODO
