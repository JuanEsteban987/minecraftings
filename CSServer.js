import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;
import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;
import java.util.ArrayList;

public class CSServer extends WebSocketServer {
    private static ConcurrentHashMap<String, String> players = new ConcurrentHashMap<>();
    private static ArrayList<String> walls = new ArrayList<>(); // Formato "x,y"

    public CSServer(int port) { super(new InetSocketAddress("0.0.0.0", port)); }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message.startsWith("UPDATE:")) {
            players.put(conn.toString(), message.substring(7));
            sync();
        } else if (message.startsWith("BUILD:")) {
            walls.add(message.substring(6));
            broadcast("WALLS:" + String.join(";", walls));
        }
    }

    private void sync() {
        StringBuilder sb = new StringBuilder("STATE:");
        players.forEach((id, data) -> sb.append(id).append("|").append(data).append(";"));
        broadcast(sb.toString());
    }

    @Override public void onOpen(WebSocket conn, ClientHandshake h) {
        // Enviar paredes existentes al nuevo jugador
        if(!walls.isEmpty()) conn.send("WALLS:" + String.join(";", walls));
    }
    @Override public void onClose(WebSocket conn, int c, String r, boolean m) { players.remove(conn.toString()); }
    @Override public void onStart() { System.out.println("SERVIDOR ONLINE EN PUERTO 8080"); }
    @Override public void onError(WebSocket conn, Exception ex) {}

    public static void main(String[] args) { new CSServer(8080).start(); }
}
