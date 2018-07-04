# intelligent-h2
intelligent h2 server


## Idea

HTTP2 server

* records requests
  * timestamp
  * category
  
* on request
  * try to find same request in history and find related sub-requests
  * related: request is close to the origin request
  
  
# Certificate
HTTP2 works best with certificates. Therefore certificates need to be installed in folder cert

```
mkdir cert
cd cert
openssl req -new -newkey rsa:2048 -sha256 -days 365 -nodes -x509 -keyout cert.key -out cert.crt
```


  
# CLI

## Parameters

- **push**: boolean value which indicates if server side push should be used or not. Possible values: true, false. By default it is active
- **folder**: the folder which should be served. by default the 'public' folder.
- **analyze**: how the analysis should be done. Possible values are "clean" which means the db is cleared on startup of the server. By default the db is cleared on startup.
- **port**: Defines the port number which is used to start the server with. By default port 3000 is used.


## Access

call https://localhost:3000/