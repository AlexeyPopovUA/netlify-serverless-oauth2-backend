const { AuthorizationCode } = require("simple-oauth2");
const randomstring = require("randomstring");
const Secrets = require("./lib/secrets");

const secrets = new Secrets({
    GIT_HOSTNAME: "https://github.com",
    OAUTH_TOKEN_PATH: "/login/oauth/access_token",
    OAUTH_AUTHORIZE_PATH: "/login/oauth/authorize",
    OAUTH_CLIENT_ID: "foo",
    OAUTH_CLIENT_SECRET: "bar",
    REDIRECT_URL: "http://localhost:3000/callback",
    OAUTH_SCOPES: "repo,user"
});

function getScript(mess, content) {
    return `<html lang="en"><meta charset="utf-8"/><body><script type="application/javascript">
  (function() {
    function receiveMessage(e) {
      console.log("receiveMessage %o", e)
      window.opener.postMessage(
        'authorization:github:${mess}:${JSON.stringify(content)}',
        e.origin
      )
      window.removeEventListener("message",receiveMessage,false);
    }
    window.addEventListener("message", receiveMessage, false)
    console.log("Sending message: %o", "github")
    window.opener.postMessage("authorizing:github", "*")
    })()
  </script></body></html>`;
}

module.exports.auth = async () => {
    await secrets.init();

    const oauth2 = new AuthorizationCode({
        client: {
            id: secrets.OAUTH_CLIENT_ID,
            secret: secrets.OAUTH_CLIENT_SECRET
        },
        auth: {
            tokenHost: secrets.GIT_HOSTNAME,
            tokenPath: secrets.OAUTH_TOKEN_PATH,
            authorizePath: secrets.OAUTH_AUTHORIZE_PATH
        }
    });

    // Authorization uri definition
    const authorizationUri = oauth2.authorizeURL({
        redirect_uri: secrets.REDIRECT_URL,
        scope: secrets.OAUTH_SCOPES,
        state: randomstring.generate(32)
    });

    return {
        statusCode: 302,
        headers: {
            Location: authorizationUri
        }
    };
};

module.exports.callback = async (e) => {
    try {
        await secrets.init();

        const oauth2 = new AuthorizationCode({
            client: {
                id: secrets.OAUTH_CLIENT_ID,
                secret: secrets.OAUTH_CLIENT_SECRET
            },
            auth: {
                tokenHost: secrets.GIT_HOSTNAME,
                tokenPath: secrets.OAUTH_TOKEN_PATH,
                authorizePath: secrets.OAUTH_AUTHORIZE_PATH
            }
        });

        const options = {
            code: e.queryStringParameters.code
        };

        const result = await oauth2.getToken(options);
        const token = result.token.access_token;
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/html"
            },
            body: getScript("success", {
                token,
                provider: "github"
            })
        };
    } catch (err) {
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/html"
            },
            body: getScript("error", err)
        };
    }
};

module.exports.success = async () => ({
    statusCode: 204,
    body: ""
});

module.exports.default = async () => ({
    statusCode: 302,
    headers: {
        Location: "/auth"
    }
});
