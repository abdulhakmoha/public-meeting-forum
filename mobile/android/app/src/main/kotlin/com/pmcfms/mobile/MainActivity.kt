package com.pmcfms.mobile

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.activity.result.contract.ActivityResultContracts
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * Native file picker that stages files before Flutter handles results.
 *
 * CRITICAL: [pendingPurpose] is also written to SharedPreferences because Android
 * may recreate the Activity while the system picker is open — the in-memory
 * field would reset to "forum" and wrongly send project picks to the forum flow.
 */
class MainActivity : FlutterFragmentActivity() {
    companion object {
        private const val PICKER_CHANNEL = "com.pmcfms.mobile/file_picker"
        private const val DOWNLOADS_CHANNEL = "com.pmcfms.mobile/downloads"
        private const val NATIVE_PREFS = "pmcfms_native_picker"
        private const val KEY_PENDING_PURPOSE = "pending_purpose"
    }

    private var pendingResult: MethodChannel.Result? = null

    private val pickMultipleFiles = registerForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments()
    ) { uris: List<Uri> ->
        stageUris(uris)
    }

    private val pickSingleFile = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        stageUris(if (uri != null) listOf(uri) else emptyList())
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val messenger = flutterEngine.dartExecutor.binaryMessenger

        MethodChannel(messenger, PICKER_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                // Dedicated methods — never rely on a "purpose" arg that can be lost
                "pickProjectFile" -> startPick(result, purpose = "project", multiple = false)
                "pickDocumentFile" -> startPick(result, purpose = "document", multiple = false)
                "pickForumFiles" -> startPick(result, purpose = "forum", multiple = true)
                "pickProgressImage" -> startPick(result, purpose = "progress", multiple = false, mimeTypes = arrayOf("image/*"))
                "pickIssueImage" -> startPick(result, purpose = "issue", multiple = false, mimeTypes = arrayOf("image/*"))
                // Back-compat
                "pickFiles" -> {
                    val purpose = call.argument<String>("purpose") ?: "forum"
                    startPick(result, purpose = purpose, multiple = purpose == "forum")
                }
                "listStaged" -> {
                    val purpose = call.argument<String>("purpose") ?: readPendingPurpose()
                    result.success(listStagedJson(purpose))
                }
                else -> result.notImplemented()
            }
        }

        MethodChannel(messenger, DOWNLOADS_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "saveToDownloads" -> {
                    try {
                        @Suppress("UNCHECKED_CAST")
                        val args = call.arguments as Map<String, Any?>
                        val bytes = args["bytes"] as ByteArray
                        val filename = (args["filename"] as? String)?.ifBlank { null }
                            ?: "document_${System.currentTimeMillis()}"
                        val mime = (args["mime"] as? String)?.ifBlank { null }
                            ?: guessMime(filename)
                        result.success(saveToDownloads(bytes, filename, mime))
                    } catch (e: Exception) {
                        result.error("SAVE_FAILED", e.message, null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun startPick(
        result: MethodChannel.Result,
        purpose: String,
        multiple: Boolean,
        mimeTypes: Array<String> = arrayOf("*/*"),
    ) {
        if (pendingResult != null) {
            result.error("BUSY", "Picker already open", null)
            return
        }
        pendingResult = result
        savePendingPurpose(purpose)

        val resumeKey = resumeKeyFor(purpose)
        flutterPrefs()
            .edit()
            .putBoolean("flutter.forum_create_resume_v1", false)
            .putBoolean("flutter.document_upload_resume_v1", false)
            .putBoolean("flutter.project_create_resume_v1", false)
            .putBoolean("flutter.project_progress_resume_v1", false)
            .putBoolean("flutter.issue_create_resume_v1", false)
            .putBoolean(resumeKey, true)
            .apply()

        if (multiple) {
            pickMultipleFiles.launch(mimeTypes)
        } else {
            pickSingleFile.launch(mimeTypes)
        }
    }

    private fun nativePrefs() = getSharedPreferences(NATIVE_PREFS, MODE_PRIVATE)

    private fun savePendingPurpose(purpose: String) {
        nativePrefs().edit().putString(KEY_PENDING_PURPOSE, purpose).apply()
    }

    private fun readPendingPurpose(): String =
        nativePrefs().getString(KEY_PENDING_PURPOSE, "forum") ?: "forum"

    private fun clearPendingPurpose() {
        nativePrefs().edit().remove(KEY_PENDING_PURPOSE).apply()
    }

    private fun flutterPrefs() =
        getSharedPreferences("FlutterSharedPreferences", MODE_PRIVATE)

    private fun resumeKeyFor(purpose: String) = when (purpose) {
        "document" -> "flutter.document_upload_resume_v1"
        "project" -> "flutter.project_create_resume_v1"
        "progress" -> "flutter.project_progress_resume_v1"
        "issue" -> "flutter.issue_create_resume_v1"
        else -> "flutter.forum_create_resume_v1"
    }

    private fun stagedKeyFor(purpose: String) = when (purpose) {
        "document" -> "flutter.document_staged_files_v1"
        "project" -> "flutter.project_staged_files_v1"
        "progress" -> "flutter.project_progress_staged_v1"
        "issue" -> "flutter.issue_staged_files_v1"
        else -> "flutter.forum_staged_files_v1"
    }

    private fun stageFolderName(purpose: String) = when (purpose) {
        "document" -> "doc_staged"
        "project" -> "project_staged"
        "progress" -> "progress_staged"
        "issue" -> "issue_staged"
        else -> "forum_staged"
    }

    private fun guessMime(filename: String): String {
        val ext = filename.substringAfterLast('.', "").lowercase()
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
            ?: when (ext) {
                "pdf" -> "application/pdf"
                "doc", "docx" -> "application/msword"
                "ppt", "pptx" -> "application/vnd.ms-powerpoint"
                "xls", "xlsx" -> "application/vnd.ms-excel"
                else -> "application/octet-stream"
            }
    }

    private fun saveToDownloads(bytes: ByteArray, displayName: String, mime: String): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, displayName)
                put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            val uri = contentResolver.insert(collection, values)
                ?: throw IllegalStateException("Could not create download entry")
            contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                ?: throw IllegalStateException("Could not write file")
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            contentResolver.update(uri, values, null, null)
            return displayName
        }

        @Suppress("DEPRECATION")
        val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!dir.exists()) dir.mkdirs()
        var out = File(dir, displayName)
        if (out.exists()) {
            val base = displayName.substringBeforeLast('.', displayName)
            val ext = displayName.substringAfterLast('.', "")
            out = File(
                dir,
                "${base}_${System.currentTimeMillis()}${if (ext.isNotEmpty()) ".$ext" else ""}"
            )
        }
        FileOutputStream(out).use { it.write(bytes) }
        return out.name
    }

    private fun listStagedJson(purpose: String): String {
        val dir = File(filesDir, stageFolderName(purpose))
        val manifest = File(dir, "manifest.json")
        if (manifest.exists()) {
            try {
                return manifest.readText()
            } catch (_: Exception) {
            }
        }
        val staged = JSONArray()
        dir.listFiles()?.filter { it.isFile && it.name != "manifest.json" && it.length() > 0L }
            ?.sortedByDescending { it.lastModified() }
            ?.take(5)
            ?.forEach { f ->
                val display = f.name.substringAfter('_', f.name)
                staged.put(JSONObject().put("name", display).put("path", f.absolutePath))
            }
        return staged.toString()
    }

    private fun queryDisplayName(uri: Uri): String? {
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) {
                return cursor.getString(idx)
            }
        }
        return uri.lastPathSegment
    }

    private fun stageUris(uris: List<Uri>) {
        val result = pendingResult
        pendingResult = null
        // Restore purpose from disk — Activity may have been recreated during picker
        val purpose = readPendingPurpose()
        try {
            val maxCount = if (purpose == "forum") 5 else 1
            val stageFolder = stageFolderName(purpose)
            val stagedKey = stagedKeyFor(purpose)
            val resumeKey = resumeKeyFor(purpose)

            val staged = JSONArray()
            val dir = File(filesDir, stageFolder).apply {
                if (exists()) listFiles()?.forEach { it.delete() }
                mkdirs()
            }

            for (uri in uris.take(maxCount)) {
                val name = queryDisplayName(uri) ?: "file_${System.currentTimeMillis()}"
                val safe = name.replace(Regex("[^A-Za-z0-9._-]"), "_")
                val out = File(dir, "${System.currentTimeMillis()}_$safe")
                contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(out).use { output -> input.copyTo(output) }
                }
                if (out.exists() && out.length() > 0L) {
                    staged.put(
                        JSONObject()
                            .put("name", name)
                            .put("path", out.absolutePath)
                    )
                }
            }

            val json = staged.toString()
            File(dir, "manifest.json").writeText(json)
            flutterPrefs()
                .edit()
                .putBoolean("flutter.forum_create_resume_v1", false)
                .putBoolean("flutter.document_upload_resume_v1", false)
                .putBoolean("flutter.project_create_resume_v1", false)
                .putBoolean("flutter.project_progress_resume_v1", false)
                .putBoolean("flutter.issue_create_resume_v1", false)
                .putString(stagedKey, json)
                .putBoolean(resumeKey, true)
                .apply()

            result?.success(json)
        } catch (e: Exception) {
            result?.error("PICK_FAILED", e.message, null)
        } finally {
            clearPendingPurpose()
        }
    }
}
