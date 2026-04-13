package com.panicmesh.app

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap

class NearbyMeshModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val connectionsClient: ConnectionsClient = Nearby.getConnectionsClient(reactContext)
  private val connectedEndpoints = ConcurrentHashMap.newKeySet<String>()
  private var localNodeId: String = ""
  private val serviceId: String
    get() = reactContext.packageName

  override fun getName(): String = "NearbyMeshModule"

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
    // Evita que ambos lados pidan conexión al mismo tiempo entre el mismo par.
    return localNodeId < remoteEndpointName
  }

  private val payloadCallback = object : PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
      if (payload.type == Payload.Type.BYTES) {
        val bytes = payload.asBytes()
        val text = bytes?.toString(StandardCharsets.UTF_8) ?: return
        val map = Arguments.createMap()
        map.putString("endpointId", endpointId)
        map.putString("payload", text)
        sendEvent("payload_received", map)
      }
    }

    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
      // Para BYTES no hace falta nada extra en esta fase 1.
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
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STOP_ERROR", e)
    }
  }

  @ReactMethod
  fun sendAlert(payloadJson: String, promise: Promise) {
    if (connectedEndpoints.isEmpty()) {
      promise.reject("NO_ENDPOINTS", "No hay dispositivos conectados.")
      return
    }

    val bytes = payloadJson.toByteArray(StandardCharsets.UTF_8)

    connectedEndpoints.forEach { endpointId ->
      connectionsClient.sendPayload(endpointId, Payload.fromBytes(bytes))
        .addOnFailureListener {
          errorEvent("Falló envío a $endpointId: ${it.message}")
        }
    }

    promise.resolve(true)
  }
}