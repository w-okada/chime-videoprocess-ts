Amazon Chime SDK JS Video Processing API Demo
===

This is the demo of the Amazon chime SDK JS Video Processing APIs. The number of sessin is up to 4, because the main pourpose is demo for video processing.

# build
## install dependency
```
npm install
```
## generate configfile
To access AWS chime server, you should set aws credential. 

If you create config.js like this, the server will use it.
```
$ cat > config.js
module.exports = {
    accessKeyId:'AKIAZxxxxxxx',
    secretAccessKey:'WuN0xxxxxxx'
}
```

Otherewise, the server will use default credential which is defined in '~/.aws' or environmental variables.

## build
```
$ npm run build
```

# Run

```
$ node server.js
```

Access to the https://localhost:8888 with your browser. (iOS safari is not supported by Amazon Chime SDK Video Processing API)

# Usage

<img src="./doc/doc.png">

# Reference


# Acknowledgement
https://pixabay.com/ja/videos/