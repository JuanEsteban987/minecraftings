import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;
import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;

public class CSServer extends WebSocketServer {
    private static ConcurrentHashMap<String, String> players = new ConcurrentHashMap<>();
    private boolean bombPlanted = false;

    public CSServer(int port) { super(new InetSocketAddress(port)); }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message.startsWith("UPDATE:")) {
            players.put(conn.toString(), message.substring(7));
            broadcastState();
        } else if (message.equals("BOMB_PLANTED")) {
            bombPlanted = true;
            broadcast("BOMB_EVENT:PLANTED");
        }
    }

    private void broadcastState() {
        StringBuilder sb = new StringBuilder("STATE:");
        players.forEach((id, data) -> sb.append(id).append("|").append(data).append(";"));
        broadcast(sb.toString());
    }

    @Override public void onOpen(WebSocket conn, ClientHandshake h) {}
    @Override public void onClose(WebSocket conn, int c, String r, boolean m) { players.remove(conn.toString()); }
    @Override public void onStart() { System.out.println("Server 2.0 Ready"); }
    @Override public void onError(WebSocket conn, Exception ex) {}

    public static void main(String[] args) { new CSServer(8080).start(); }
}
