Maelstrom
=========

Application to collect and distribute incoming messages from either browser (socket.io) or via HTTP API request.

###Local development usage:

Make sure you have mongodb and redis installed (brew install, or other install method)

Run the dependencies

* npm install
* redis-server /usr/local/etc/redis.conf
* mongod

Spawn one or more processes of the application

* node app 'port'

####Example:

Open a separate terminal window for each of the following commands

- redis-server /usr/local/etc/redis.conf
- mongod
- node app 3001
- node app 3002

You now have two processes of the application running,
which should be reachable on http://localhost:3001 and http://localhost:3002 respectively. 
If you were to load balance you would put nginx or varnish as a reverse proxy in front of these. All processes spawned will be connected through the custom redis rpc.

###Unit tests

- To run tests, first install nodeunit (npm install nodeunit -g)
- Start the depencencies (redis-server and mongod)
- Run tests with 'nodeunit test.js'