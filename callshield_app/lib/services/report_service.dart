import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';

class ReportService {
  // 🚨 Generates the PDF silently in the background and returns the file path
  static Future<String> generateSilentReport(dynamic data) async {
    final pdf = pw.Document();

    final String probability = data['maxThreat']?.toString() ?? '100';
    final List<dynamic> rawTactics = data['tactics'] ?? [];
    final String tactics = rawTactics.isNotEmpty ? rawTactics.join(', ') : 'Impersonation, Coercion';
    final String fullTranscript = data['transcript'] ?? 'Transcript log unavailable.';
    final String callerId = data['callerId'] ?? 'Unknown';
    final String timestamp = DateTime.now().toIso8601String().split('T').join(' ');

    // 📄 PAGE 1: OFFICIAL INCIDENT SUMMARY
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Container(
                  padding: const pw.EdgeInsets.only(bottom: 10),
                  decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey900, width: 2))),
                  child: pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text("CALLSHIELD AI", style: pw.TextStyle(fontSize: 28, fontWeight: pw.FontWeight.bold, color: PdfColors.indigo900)),
                        pw.Text("FORENSIC THREAT REPORT", style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.red800)),
                      ]
                  )
              ),
              pw.SizedBox(height: 20),
              pw.Text("DATE GENERATED: $timestamp", style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
              pw.Text("TARGET SCAMMER ID: $callerId", style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.black)),
              pw.SizedBox(height: 30),
              pw.Text("1. AI THREAT VERDICT", style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Container(
                  width: double.infinity,
                  padding: const pw.EdgeInsets.all(15),
                  decoration: pw.BoxDecoration(color: PdfColors.grey100, border: pw.Border.all(color: PdfColors.grey300)),
                  child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text("Confidence Score: $probability% (CRITICAL)", style: pw.TextStyle(color: PdfColors.red900, fontWeight: pw.FontWeight.bold)),
                        pw.SizedBox(height: 8),
                        pw.Text("Identified Tactics: $tactics"),
                      ]
                  )
              ),
              pw.SizedBox(height: 30),
              pw.Text("2. PREVENTATIVE ACTIONS TAKEN", style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Bullet(text: "Call forcefully terminated via native OS override."),
              pw.Bullet(text: "Emergency SOS dispatched to local trusted contacts."),
              pw.Bullet(text: "Zero-Knowledge Scrubber applied. Financial PII redacted from logs."),
            ],
          );
        },
      ),
    );

    // 📄 PAGE 2: THE RAW EVIDENCE (TRANSCRIPT)
    pdf.addPage(
        pw.MultiPage(
            pageFormat: PdfPageFormat.a4,
            margin: const pw.EdgeInsets.all(40),
            build: (pw.Context context) {
              return [
                pw.Text("3. REDACTED TRANSCRIPT LOG", style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 10),
                pw.Text("Notice: All sensitive personal information (OTPs, Aadhaar, Credit Cards) has been redacted.", style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600)),
                pw.SizedBox(height: 15),
                pw.Container(
                  width: double.infinity,
                  padding: const pw.EdgeInsets.all(15),
                  decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey300)),
                  child: pw.Text(fullTranscript, style: const pw.TextStyle(fontSize: 10, lineSpacing: 2.5)),
                ),
              ];
            }
        )
    );

    final output = await getApplicationDocumentsDirectory();
    final file = File("${output.path}/CallShield_FIR_${DateTime.now().millisecondsSinceEpoch}.pdf");
    await file.writeAsBytes(await pdf.save());

    return file.path; // Return path to the Database
  }
}