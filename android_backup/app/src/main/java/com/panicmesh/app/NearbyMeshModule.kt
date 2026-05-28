package com.panicmesh.app

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class NearbyMeshModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val connectionsClient: ConnectionsClient = Nearby.getConnectionsClient(reactContext)
  private val connectedEndpoints = ConcurrentHashMap.newKeySet<String>()
  private val seenMessageIds = ConcurrentHashMap.newKeySet<String>()
  private var localNodeId: String = ""
  private val serviceId: String
    get() = reactContext.packageName

  private val cleanupScheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
  private val DEFAULT_TTL = 5

  override fun getName(): String = "NearbyMeshModule"

  init {
    cleanupScheduler.scheduleAtFixedRate({
      seenMessageIds.clear()
    }, 60, 60, TimeUnit.SECONDS)
  }

  private fun sendEvent(name: String, params: WritableMap? = null) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(name, params)
  }

  private fun errorEvent(message: String) {
    val map = Arguments.createMap()
    map.putString("message", message)
    sendEvent("native_error", map)
  }

  private fun shouldInitiateConnection(remoteEndpointName: String): Boolean {
    return localNodeId < remoteEndpointName
  }

  private fun forwardPayload(originalPayload: ByteArray, fromEndpointId: String) {
    val json = String(originalPayload, StandardCharsets.UTF_8)
    val obj = try {
      JSONObject(json)
    } catch (e: Exception) {
      return
    }

    val messageId = obj.optString("messageId")
    if (messageId.isEmpty() || seenMessageIds.contains(messageId)) {
      return
    }
    seenMessageIds.add(messageId)

    val ttl = obj.optInt("ttl", DEFAULT_TTL)
    if (ttl <= 0) {
      return
    }

    obj.put("ttl", ttl - 1)
    obj.put("hops", obj.optInt("hops", 0) + 1)
    val forwardedBytes = obj.toString().toByteArray(StandardCharsets.UTF_8)

    connectedEndpoints.forEach { endpointId ->
      if (endpointId != fromEndpointId) {
        connectionsClient.sendPayload(endpointId, Payload.fromBytes(forwardedBytes))
          .addOnFailureListener {
            errorEvent("Falló reenvío a $endpointId: ${it.message}")
          }
      }
    }
  }

  private val payloadCallback = object : PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
      if (payload.type == Payload.Type.BYTES) {
        val bytes = payload.asBytes() ?: return
        val text = bytes.toString(StandardCharsets.UTF_8)

        val map = Arguments.createMap()
        map.putString("endpointId", endpointId)
        map.putString("payload", text)
        sendEvent("payload_received", map)

        forwardPayload(bytes, endpointId)
      }
    }

    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
    }
  }

  private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
      // En esta fase 1 aceptamos automáticamente toda conexión válida.
      connectionsClient.acceptConnection(endpointId, payloadCallback)
        .addOnFailureListener {
          errorEvent("No se pudo aceptar conexión con $endpointId: ${it.message}")
        }
    }

    override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
      val status = resolution.status
      val map = Arguments.createMap()
      map.putString("endpointId", endpointId)

      if (status.statusCode == ConnectionsStatusCodes.STATUS_OK) {
        connectedEndpoints.add(endpointId)
        map.putBoolean("success", true)
      } else {
        map.putBoolean("success", false)
      }

      map.putInt("connectedCount", connectedEndpoints.size)
      sendEvent("connection_result", map)
    }

    override fun onDisconnected(endpointId: String) {
      connectedEndpoints.remove(endpointId)
      val map = Arguments.createMap()
      map.putString("endpointId", endpointId)
      map.putInt("connectedCount", connectedEndpoints.size)
      sendEvent("endpoint_disconnected", map)
    }
  }

  private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
    override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
      val endpointName = info.endpointName

      val foundMap = Arguments.createMap()
      foundMap.putString("endpointId", endpointId)
      foundMap.putString("endpointName", endpointName)
      sendEvent("endpoint_found", foundMap)

      if (endpointName == localNodeId) return

      if (shouldInitiateConnection(endpointName)) {
        connectionsClient.requestConnection(
          localNodeId,
          endpointId,
          connectionLifecycleCallback
        ).addOnFailureListener {
          errorEvent("No se pudo pedir conexión a $endpointId: ${it.message}")
        }
      }
    }

    override fun onEndpointLost(endpointId: String) {
      // Opcional para esta fase.
    }
  }

  @ReactMethod
  fun startMesh(nodeId: String, promise: Promise) {
    localNodeId = nodeId

    val advertisingOptions = AdvertisingOptions.Builder()
      .setStrategy(Strategy.P2P_CLUSTER)
      .build()

    val discoveryOptions = DiscoveryOptions.Builder()
      .setStrategy(Strategy.P2P_CLUSTER)
      .build()

    connectionsClient.startAdvertising(
      localNodeId,
      serviceId,
      connectionLifecycleCallback,
      advertisingOptions
    ).addOnSuccessListener {
      connectionsClient.startDiscovery(
        serviceId,
        endpointDiscoveryCallback,
        discoveryOptions
      ).addOnSuccessListener {
        val map = Arguments.createMap()
        map.putString("serviceId", serviceId)
        map.putString("nodeId", localNodeId)
        sendEvent("mesh_started", map)
        promise.resolve(true)
      }.addOnFailureListener {
        errorEvent("No se pudo iniciar discovery: ${it.message}")
        promise.reject("DISCOVERY_ERROR", it)
      }
    }.addOnFailureListener {
      errorEvent("No se pudo iniciar advertising: ${it.message}")
      promise.reject("ADVERTISING_ERROR", it)
    }
  }

  @ReactMethod
  fun stopMesh(promise: Promise) {
    try {
      connectionsClient.stopAdvertising()
      connectionsClient.stopDiscovery()
      connectionsClient.stopAllEndpoints()
      connectedEndpoints.clear()
      seenMessageIds.clear()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STOP_ERROR", e)
    }
  }

  @ReactMethod
  fun sendAlert(payloadJson: String, promise: Promise) {
    val json = try {
      JSONObject(payloadJson)
    } catch (e: Exception) {
      promise.reject("JSON_ERROR", "Payload inválido: ${e.message}")
      return
    }

    json.put("messageId", "${localNodeId}_${System.currentTimeMillis()}_${(Math.random() * 10000).toInt()}")
    json.put("ttl", DEFAULT_TTL)
    json.put("hops", 0)

    val finalPayload = json.toString()
    val bytes = finalPayload.toByteArray(StandardCharsets.UTF_8)

    val messageId = json.getString("messageId")
    seenMessageIds.add(messageId)

    if (connectedEndpoints.isEmpty()) {
      promise.reject("NO_ENDPOINTS", "No hay dispositivos conectados.")
      return
    }

    connectedEndpoints.forEach { endpointId ->
      connectionsClient.sendPayload(endpointId, Payload.fromBytes(bytes))
        .addOnFailureListener {
          errorEvent("Fallo envío a $endpointId: ${it.message}")
        }
    }

    promise.resolve(true)
  }
}