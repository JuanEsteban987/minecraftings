import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;
import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;

public class CSServer extends WebSocketServer {
    // Registro de jugadores: ID -> Datos (x,y,angulo,equipo,moviendose,disparando)
    private static ConcurrentHashMap<String, String> players = new ConcurrentHashMap<>();
    private String bombStatus = "IDLE"; // IDLE, PLANTED

    public CSServer(int port) { 
        super(new InetSocketAddress("0.0.0.0", port)); 
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("Jugador unido: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        players.remove(conn.toString());
        broadcast("REMOVE:" + conn.toString());
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message.startsWith("UPDATE:")) {
            players.put(conn.toString(), message.substring(7));
            syncGlobalState();
        } else if (message.equals("BOMB_PLANT")) {
            bombStatus = "PLANTED";
            broadcast("BOMB_EVENT:PLANTED");
        }
    }

    private void syncGlobalState() {
        StringBuilder sb = new StringBuilder("STATE:");
        players.forEach((id, data) -> sb.append(id).append("|").append(data).append(";"));
        broadcast(sb.toString());
    }

    @Override public void onStart() { System.out.println("Servidor Survivor-CS iniciado en puerto 8080"); }
    @Override public void onError(WebSocket conn, Exception ex) { ex.printStackTrace(); }

    public static void main(String[] args) { new CSServer(8080).start(); }
}
