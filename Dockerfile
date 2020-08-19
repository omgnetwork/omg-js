FROM node:12-alpine

# Add other convenient dependency
# For instace, we would like curl to trigger slack hook when using this docker to run test
RUN apk update && apk add shadow git python g++ make curl

COPY . /home/omg/

RUN useradd -ms /bin/bash omg
RUN chown -R omg:omg /home/omg/

USER omg

WORKDIR /home/omg/

# WARNING: omg-js has a postinstall hook that will only be working if not running as root
# https://stackoverflow.com/questions/47748075/npm-postinstall-not-running-in-docker
# Since we are running as user: `omg` so it will be fine here
RUN npm install
