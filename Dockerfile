FROM node:latest
USER node
RUN mkdir /home/node/src
WORKDIR /home/node/src 
COPY --chown=node:node . /home/node/src
RUN npm ci 
CMD ["npm", "start"]
