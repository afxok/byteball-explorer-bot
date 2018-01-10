FROM node:8.9.3-alpine

RUN     adduser -D -u 1500 byteball \
        && apk add --no-cache --virtual .build-deps git tini python bash make g++ \
#       && apk del .build-deps \
        && mkdir /byteball /home/byteball/.config \
        && chown byteball:byteball /byteball /home/byteball/.config \
        && ln -s /byteball /home/byteball/.config/byteball-explorer-bot

VOLUME /byteball

USER byteball
RUN     cd /home/byteball \
        && git clone https://github.com/afxok/byteball-explorer-bot \
        && cd byteball-explorer-bot \
        && npm install

WORKDIR /home/byteball/byteball-explorer-bot

EXPOSE 6611 

#ENTRYPOINT ["/sbin/tini", "--"]
#CMD [ "/bin/sh", "-c", "node explorer-bot.js 2>> /home/byteball/.config/byteball-explorer-bot/error.log" ]
CMD [ "/bin/sh", "-c", "node explorer-bot.js" ]

