package com.panicmesh.app

import android.annotation.SuppressLint
import android.content.Context
import android.location.Criteria
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class NativeLocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val locationManager =
    reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager

  private var continuousListener: LocationListener? = null

  override fun getName(): String = "NativeLocationModule"

  private fun sendEvent(name: String, params: com.facebook.react.bridge.WritableMap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(name, params)
  }

  private fun locationToMap(location: Location) = Arguments.createMap().apply {
    putDouble("latitude", location.latitude)
    putDouble("longitude", location.longitude)
    putDouble("accuracy", location.accuracy.toDouble())
    putDouble("timestamp", location.time.toDouble())
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun getLastKnownLocation(promise: Promise) {
    try {
      val providers = locationManager.getProviders(true)
      var best: Location? = null

      for (provider in providers) {
        val loc = locationManager.getLastKnownLocation(provider) ?: continue
        if (best == null || loc.accuracy < best!!.accuracy) {
          best = loc
        }
      }

      if (best != null) {
        promise.resolve(locationToMap(best!!))
      } else {
        promise.resolve(null)
      }
    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", "Ubicación sin permisos")
    } catch (e: Exception) {
      promise.reject("LOCATION_ERROR", e)
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun getCurrentLocation(timeoutMs: Int, promise: Promise) {
    val criteria = Criteria().apply {
      accuracy = Criteria.ACCURACY_FINE
      isSpeedRequired = false
      isBearingRequired = false
      isAltitudeRequired = false
    }

    val provider = locationManager.getBestProvider(criteria, true)
    if (provider == null) {
      promise.reject("NO_PROVIDER", "No hay proveedor de ubicación disponible")
      return
    }

    val handler = Handler(Looper.getMainLooper())
    var resolved = false

    val listener = object : LocationListener {
      override fun onLocationChanged(location: Location) {
        if (resolved) return
        resolved = true
        handler.removeCallbacksAndMessages(null)
        locationManager.removeUpdates(this)
        promise.resolve(locationToMap(location))
      }

      override fun onProviderDisabled(provider: String) {
        if (resolved) return
        resolved = true
        handler.removeCallbacksAndMessages(null)
        locationManager.removeUpdates(this)
        promise.reject("PROVIDER_DISABLED", "Proveedor deshabilitado")
      }
    }

    try {
      locationManager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", "Ubicación sin permisos")
      return
    } catch (e: Exception) {
      promise.reject("LOCATION_ERROR", e)
      return
    }

    val timeout = if (timeoutMs < 500) 500 else timeoutMs
    handler.postDelayed({
      if (resolved) return@postDelayed
      resolved = true
      locationManager.removeUpdates(listener)
      promise.reject("TIMEOUT", "Tiempo de espera agotado")
    }, timeout.toLong())
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun startContinuousUpdates(minTimeMs: Int, minDistanceM: Double, promise: Promise) {
    if (continuousListener != null) {
      promise.resolve(true)
      return
    }

    val criteria = Criteria().apply {
      accuracy = Criteria.ACCURACY_FINE
      isSpeedRequired = false
      isBearingRequired = false
      isAltitudeRequired = false
    }

    val provider = locationManager.getBestProvider(criteria, true)
    if (provider == null) {
      promise.reject("NO_PROVIDER", "No hay proveedor de ubicación disponible")
      return
    }

    val listener = object : LocationListener {
      override fun onLocationChanged(location: Location) {
        val map = locationToMap(location)
        sendEvent("location_update", map)
      }

      override fun onProviderDisabled(provider: String) {
        // Ignorar por ahora
      }
    }

    try {
      locationManager.requestLocationUpdates(
        provider,
        minTimeMs.toLong(),
        minDistanceM.toFloat(),
        listener,
        Looper.getMainLooper()
      )
      continuousListener = listener
      promise.resolve(true)
    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", "Ubicación sin permisos")
    } catch (e: Exception) {
      promise.reject("LOCATION_ERROR", e)
    }
  }

  @ReactMethod
  fun stopContinuousUpdates(promise: Promise) {
    try {
      continuousListener?.let { locationManager.removeUpdates(it) }
      continuousListener = null
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("LOCATION_ERROR", e)
    }
  }
}