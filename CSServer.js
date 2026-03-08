import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;
import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Timer;
import java.util.TimerTask;

public class ProGameServer extends WebSocketServer {
    private static ConcurrentHashMap<String, String> players = new ConcurrentHashMap<>();

    public ProGameServer(int port) {
        super(new InetSocketAddress("0.0.0.0", port));
    }

    @Override
    public void onStart() {
        System.out.println("Servidor Pro iniciado en puerto 8080");
        // TICK RATE: Enviamos el estado a todos 20 veces por segundo (cada 50ms)
        new Timer().scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                broadcastState();
            }
        }, 0, 50);
    }

    private void broadcastState() {
        if (players.isEmpty()) return;
        StringBuilder sb = new StringBuilder("S:");
        players.forEach((id, data) -> sb.append(id).append("|").append(data).append(";"));
        broadcast(sb.toString());
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message.startsWith("U:")) { // Update corto para ahorrar ancho de banda
            players.put(conn.toString().substring(0, 5), message.substring(2));
        }
    }

    @Override public void onOpen(WebSocket conn, ClientHandshake h) {}
    @Override public void onClose(WebSocket conn, int c, String r, boolean m) { players.remove(conn.toString().substring(0, 5)); }
    @Override public void onError(WebSocket conn, Exception ex) {}

    public static void main(String[] args) { new ProGameServer(8080).start(); }
}
