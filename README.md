# Desdemona

## Discord Destiny Bot

This started out as a simple bot to pull destiny stats from bungie, however it has
grown organically and now has a few other features related to gaming in general

## Installation

1. Install [node.js](https://nodejs.org/en/download/)
2. Install [mongoDB](https://www.mongodb.com/)
3. Clone this repo

        $ git clone https://github.com/GeekyDeaks/discord-destinybot.git

4. Download the required node modules from NPM

        $ cd discord-destinyboy
        $ npm install

5. Create the config.js

        $ cp config_template.js config.js

6. Get your bungie APIKEY from 
    [https://www.bungie.net/en/User/API](https://www.bungie.net/en/User/API)
    and save it under `config.destiny.apikey`

7. Add the app to your discord account [https://discordapp.com/developers/applications/me](https://discordapp.com/developers/applications/me)

8. Create a user for the app and copy the token to `config.discord.token`

9. Using the Client ID found in App Details, 
   create an invite link in the following format 
   
        https://discordapp.com/oauth2/authorize?scope=bot&client_id=CLIENT_ID

10. Start the bot

        node destinybot.js

## PM2

This bot relies upon discord.js, which appears to throw uncaught exceptions from certain network
errors.  When this occurs, the bot will simply crash.  The cause of this is still under investigation,
but to workaround the problem in the interim, we recommend using something like pm2 to keep the bot alive

        sudo npm install pm2 -g
        pm2 start destinybot.js

## Destiny Manifest

The bot can lookup the current activity of a guardian if the 
destiny manifest is correctly downloaded.  This is still work in
progress, but after the bot is configured, you can run the following
command to initialise the manifest from bungie:

        node manifest_update.js en

Unfortunately this is a bit of a hack at present until the
auto refresh is completed.  It also relies upon mongoDB, so you will
need to make sure that is also installed and configured correctly.

# modules

In `config_template.js` you will see section called `modules`.
Each module provides some element of functionality and can also
provide it's own commands.  You can disable a module by removing
it from the config, but at present removing some key modules
may cause the bot to behave unpredicatably.

## destiny

This is the module for pulling stats from https://www.bungie.net/Platform/Destiny.

It currently implements the following two commands:

        stats [xbl|psn] <@discord|PSN|XBL>
        summary [xbl|psn] <@discord|PSN|XBL>

## gamer

This module provides a database of gamers, with the following detail:

* PSN ID
* XBL Gamertag
* Timezone
* Current games of interest

Other modules can use this modules to map @discord ID's
to either PSN or XBL accounts.  It also allows lookup of
other players of a particular game.

e.g.

        players DY

will provide a list of all the players who have expressed
an interest in DY (destiny), showing details of their current 
local time

The current commands are:

        players <game>
        gamer <@discord>

Not very consistent naming - sorry!

At present the commands to edit these entries are still
under development.