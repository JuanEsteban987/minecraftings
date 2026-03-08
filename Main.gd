extends Node

@onready var main_menu = $CanvasLayer/MainMenu
@onready var world_container = $WorldContainer

const PORT = 7000
var enet_peer = ENetMultiplayerPeer.new()

# Diccionario de mundos
var worlds = {
	"lobby": preload("res://Lobby.tscn"),
	"mundo2": preload("res://Mundo2.tscn"),
	"mundo3": preload("res://Mundo3.tscn")
}

func _on_host_pressed():
	main_menu.hide()
	enet_peer.create_server(PORT)
	multiplayer.multiplayer_peer = enet_peer
	multiplayer.peer_connected.connect(add_player)
	add_player(multiplayer.get_unique_id()) # Añadir al host
	load_world("lobby")

func _on_join_pressed():
	main_menu.hide()
	enet_peer.create_client("localhost", PORT)
	multiplayer.multiplayer_peer = enet_peer

func add_player(peer_id):
	var player = preload("res://Player.tscn").instantiate()
	player.name = str(peer_id)
	add_child(player)

@rpc("authority", "call_local")
func load_world(world_name):
	# Limpiar mundo anterior
	for child in world_container.get_children():
		child.queue_free()
	
	# Instanciar nuevo mundo
	var new_world = worlds[world_name].instantiate()
	world_container.add_child(new_world)
