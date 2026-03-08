import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;
import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;
import java.util.ArrayList;
import java.util.Timer;
import java.util.TimerTask;

public class CSServer extends WebSocketServer {
    private static ConcurrentHashMap<String, String> players = new ConcurrentHashMap<>();
    private static ArrayList<String> walls = new ArrayList<>();
    private boolean bombPlanted = false;

    public CSServer(int port) { super(new InetSocketAddress("0.0.0.0", port)); }

    @Override
    public void onStart() {
        System.out.println("Servidor Maestro Survivor-CS iniciado en puerto 8080");
        // Enviar actualizaciones constantes cada 50ms
        new Timer().scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() { sync(); }
        }, 0, 50);
    }

    private void sync() {
        if (players.isEmpty()) return;
        StringBuilder sb = new StringBuilder("S:");
        players.forEach((id, data) -> sb.append(id).append("|").append(data).append(";"));
        broadcast(sb.toString());
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        String id = Integer.toHexString(conn.hashCode());
        if (message.startsWith("U:")) {
            players.put(id, message.substring(2));
        } else if (message.startsWith("B:")) { // Build
            walls.add(message.substring(2));
            broadcast("W:" + String.join(";", walls));
        } else if (message.equals("BOMB")) {
            bombPlanted = true;
            broadcast("EV:BOMB_PLANTED");
        }
    }

    @Override public void onOpen(WebSocket conn, ClientHandshake h) {
        if(!walls.isEmpty()) conn.send("W:" + String.join(";", walls));
    }
    @Override public void onClose(WebSocket conn, int c, String r, boolean m) { 
        players.remove(Integer.toHexString(conn.hashCode())); 
    }
    @Override public void onError(WebSocket conn, Exception ex) {}

    public static void main(String[] args) { new CSServer(8080).start(); }
}
