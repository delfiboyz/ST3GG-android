package com.st3gg.app

import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class MainActivity : AppCompatActivity() {

    private var webView: WebView? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        webView?.settings?.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
        }

        webView?.addJavascriptInterface(WebAppInterface(this), "Android")
        webView?.webViewClient = WebViewClient()
        webView?.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent()
                if (intent == null) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        webView?.loadUrl("file:///android_asset/www/index.html")
    }

    class WebAppInterface(private val mContext: Context) {
        @JavascriptInterface
        fun shareImage(base64Image: String) {
            shareBase64File(base64Image, "stego_result.png", "image/png")
        }

        @JavascriptInterface
        fun shareSafe(base64Image: String) {
            // Share as .stg file to avoid WhatsApp compression
            shareBase64File(base64Image, "rahasia_st3gg.png.stg", "application/octet-stream")
        }

        private fun shareBase64File(base64Image: String, filename: String, mimeType: String) {
            try {
                val pureBase64 = base64Image.substringAfter(",")
                val imageBytes = Base64.decode(pureBase64, Base64.DEFAULT)
                
                val cachePath = File(mContext.cacheDir, "shared_files")
                cachePath.mkdirs()
                val file = File(cachePath, filename)
                val stream = FileOutputStream(file)
                stream.write(imageBytes)
                stream.close()

                val contentUri = FileProvider.getUriForFile(mContext, "${mContext.packageName}.fileprovider", file)

                if (contentUri != null) {
                    val shareIntent = Intent()
                    shareIntent.action = Intent.ACTION_SEND
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    shareIntent.setDataAndType(contentUri, mimeType)
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri)
                    shareIntent.type = mimeType
                    mContext.startActivity(Intent.createChooser(shareIntent, "Bagikan via..."))
                }
            } catch (e: Exception) {
                (mContext as Activity).runOnUiThread {
                    Toast.makeText(mContext, "Gagal membagikan: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        @JavascriptInterface
        fun saveImage(base64Image: String) {
            try {
                val pureBase64 = base64Image.substringAfter(",")
                val imageBytes = Base64.decode(pureBase64, Base64.DEFAULT)
                val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

                val filename = "ST3GG_${System.currentTimeMillis()}.png"
                var fos: OutputStream? = null

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val resolver = mContext.contentResolver
                    val contentValues = ContentValues()
                    contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                    contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/ST3GG")
                    val imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                    fos = imageUri?.let { resolver.openOutputStream(it) }
                } else {
                    val imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES).toString()
                    val st3ggDir = File(imagesDir, "ST3GG")
                    if (!st3ggDir.exists()) st3ggDir.mkdirs()
                    val image = File(st3ggDir, filename)
                    fos = FileOutputStream(image)
                    
                    // Notify gallery
                    val intent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
                    intent.data = Uri.fromFile(image)
                    mContext.sendBroadcast(intent)
                }

                fos?.use {
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
                    (mContext as Activity).runOnUiThread {
                        Toast.makeText(mContext, "Gambar disimpan ke Galeri", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                (mContext as Activity).runOnUiThread {
                    Toast.makeText(mContext, "Gagal menyimpan gambar: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback == null) return
            val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    override fun onBackPressed() {
        if (webView?.canGoBack() == true) {
            webView?.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
