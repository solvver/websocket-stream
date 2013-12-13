var isBuffer = require('isbuffer')
var WebSocketPoly = require('ws')
var util=require("util")
var stream=require("stream")


util.inherits(WebsocketStream, stream.Duplex)
function WebsocketStream(server, options) {
  if (!(this instanceof WebsocketStream)) return new WebsocketStream(server, options)
  this.options = options || {}
  this._buffer = []
 
  if (typeof server === "object") {
    this.ws = server
    this.ws.on('message', this.onMessage.bind(this))
    this.ws.on('error', this.onError.bind(this))
    this.ws.on('close', this.onClose.bind(this))
    this.ws.on('open', this.onOpen.bind(this))
    if (this.ws.readyState === 1) this._open = true
  } else {
    this.ws = new WebSocketPoly(server, this.options.protocol)
    this.ws.binaryType = this.options.binaryType || 'arraybuffer'
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onerror = this.onError.bind(this)
    this.ws.onclose = this.onClose.bind(this)
    this.ws.onopen = this.onOpen.bind(this)
  }
    var self=this;
    var closeOrEnd=function(){
        if(self.ws.readyState<=1) self.ws.close();
    }
    this.on("close", closeOrEnd);
    this.on("end", closeOrEnd);
    stream.Duplex.call(this, options);
  //return this.stream
}

module.exports = WebsocketStream
module.exports.WebsocketStream = WebsocketStream

WebsocketStream.prototype.onMessage = function(e) {
  var data = e
  if (data.data) data = data.data
  
  // type must be a Typed Array (ArrayBufferView)
  var type = this.options.type
  if (type && data instanceof ArrayBuffer) data = new type(data)
  
  this.push(data)
}

WebsocketStream.prototype.onError = function(err) {
  this.emit('error', err)
}

WebsocketStream.prototype.onClose = function(err) {
  if (this._destroy) return
  this.emit('end')
  this.emit('close')
}

WebsocketStream.prototype.onOpen = function(err) {
  if (this._destroy) return
  this._open = true
  for (var i = 0; i < this._buffer.length; i++) {
    this._write(this._buffer[i])
  }
  this._buffer = undefined
  this.emit('open')
  this.emit('connect')
  if (this._end) this.ws.close()
}

/*
* want to honor streams2 API
WebsocketStream.prototype.write = function(data) {
  if (!this._open) {
    this._buffer.push(data)
  }  else {
    this._write(data)
  }
}*/

WebsocketStream.prototype._write = function(data, encoding, callback) {
    if(this.ws.readyState==0){
        return this.on("open", function(){
            this.doWrite(data);
            callback();
        })
    } else{
        if(this.ws.readyState==1){
        this.doWrite(data);
        return callback();
        }
    }
}
WebsocketStream.prototype.doWrite=function(data){
    var self=this;
    setImmediate(function(){
        self.ws.send(data, {binary: false});
    })
}

