## instagram-scrapper
Node project to collect Profiles, Posts and Likes, Comments, Follows, Following stats from Instagram profiles without sign-up to their API and without user consent.

## Is there a live example?
You can go to http://iscrapper.herokuapp.com/ and register profiles, but please delete them later because this database is limited. There is also an API to export the collected data at: http://iscrapper.herokuapp.com/api-docs

## About the app
Actually, there are two separated apps. The Client which serves the FrontEnd (using React), and the Backend (in Node/Express/Mongo).

## How to run the Backend
1. Navigate to the `backend` directory.
2. Change the `.env` file to your desired configuration.
3. Open a terminal.
4. Run `npm install` to install all dependencies.
5. Run `npm start` to start the app.

## How to run the Client
1. Navigate to the `client` directory.
2. Change the `.env` file to your desired configuration.
3. Open a terminal.
4. Run `npm install` to install all dependencies.
5. Run `npm start` to start the app.

## Check if they are connected
1. With the two apps running, open your browser in http://localhost:3000/.
2. Open chrome dev tools to check for backend logs.
3. Enjoy!

## To build the project for deployment
1. Navigate to the `client` directory.
2. Open a terminal.
3. Run `npm run build` to build the client project.
4. Copy the contents of the `client/build` folder to `backend/app/public`
5. Deploy the contents of the `backend` folder to your server. (I'm using Heroku and mLab)

## Backend .env configuration fields
```
APPLICATION_INSIGHTS_KEY  # Azure application insights instrumentation key
MONGODB_URI               # mongodb://<user>:<password>@<server and options>
MONGODB_DBNAME            # Database name 
MONGODB_CREATE            # This option when is true will create all collections and indexes
MAX_PROFILES              # How many profiles will be scrapped at the same time
MAX_DOWNLOADS             # How many posts download will be placed at the same time
ISCRAPPER_READONLY        # This will disable delete and creation of profiles on your instance
ENVIRONMENT               # Outputs logs to console when in DEV
```

## Client .env configuration fields
```
REACT_APP_BACKEND_URL              # Backend address
REACT_APP_APPLICATION_INSIGHTS_KEY # Azure application insights instrumentation key
```

