import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;
import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;

public class CSServer extends WebSocketServer {
    private static ConcurrentHashMap<String, String> players = new ConcurrentHashMap<>();

    public CSServer(int port) { super(new InetSocketAddress(port)); }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("Conectado: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        players.remove(conn.toString());
        broadcast("REMOVE:" + conn.toString());
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message.startsWith("UPDATE:")) {
            // Recibe: ID|x,y,angle,weaponIndex,isFiring,team
            players.put(conn.toString(), message.substring(7));
            broadcastState();
        } else if (message.startsWith("HIT:")) {
            // El servidor retransmite quién recibió el impacto
            broadcast(message);
        }
    }

    private void broadcastState() {
        StringBuilder sb = new StringBuilder("STATE:");
        players.forEach((id, data) -> {
            sb.append(id).append("|").append(data).append(";");
        });
        broadcast(sb.toString());
    }

    @Override public void onStart() { System.out.println("Server CS 2D en puerto 8080"); }
    @Override public void onError(WebSocket conn, Exception ex) { ex.printStackTrace(); }

    public static void main(String[] args) { new CSServer(8080).start(); }
}
