// src/socket-connection.ts
type MessageCallback = (msg: MessageEvent) => void;

interface BootupMessage {
  type: 'bootup';
  user: string;
}

class SocketConnection {
  private socket: WebSocket;

  constructor(url: string = 'ws://chat.sxcntcnqunts.com/ws') {
    this.socket = new WebSocket(url);
  }

  /**
   * Connect and set up message handlers
   */
  connect(cb: MessageCallback): void {
    console.log('connecting', this.socket.url);

    this.socket.onopen = () => {
      console.log('Successfully Connected!');
    };

    this.socket.onmessage = (msg: MessageEvent) => {
      cb(msg);
    };

    this.socket.onclose = (event: CloseEvent) => {
      console.log('Socket Closed Connection: ', event);
    };

    this.socket.onerror = (error: Event) => {
      console.log('Socket Error: ', error);
    };
  }

  /**
   * Send any object as a JSON string
   */
  sendMsg(msg: unknown): void {
    console.log(msg);
    this.socket.send(JSON.stringify(msg));
  }

  /**
   * Set up a connection callback specific to a user
   */
  connected(user: string): void {
  if (this.socket.readyState === WebSocket.OPEN) {
    // Already open — map immediately
    this.mapConnection(user)
  } else {
    // Queue after open
    const prev = this.socket.onopen
    this.socket.onopen = (e) => {
      prev?.(e as Event)
      this.mapConnection(user)
    }
  }
}

  /**
   * Send a bootup message for mapping the user
   */
  private mapConnection(user: string): void {
    console.log('mapping', user);
    const bootupMsg: BootupMessage = { type: 'bootup', user };
    this.socket.send(JSON.stringify(bootupMsg));
  }
}

export default SocketConnection;
