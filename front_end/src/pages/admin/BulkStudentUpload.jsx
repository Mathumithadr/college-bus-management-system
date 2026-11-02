// BulkStudentUpload — Allows admins to upload a CSV file to assign students in bulk.
// 
// CSV Format expected:
// email,busNumber,routeNumber
// student1@college.edu,B-12,R05
//
// The component parses the CSV, matches the bus/route, and sends ONE bulk request.

import React, { useState } from 'react';
import Papa from 'papaparse';
import axiosClient from '../../api/axiosClient';
import { Upload, Download, AlertCircle, CheckCircle, X, FileSpreadsheet } from 'lucide-react';

export default function BulkStudentUpload({ buses, routes, students, onSuccess, onCancel }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Download a sample CSV
  const downloadTemplate = () => {
    const csvContent = "email,busNumber,routeNumber\nstudent1@college.edu,B-12,R05\nstudent2@college.edu,B-12,R05";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "student_assignment_template.csv";
    link.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = () => {
    if (!file) return setError('Please select a CSV file.');

    setParsing(true);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setParsing(false);
        const rows = results.data;

        if (rows.length === 0) return setError('The CSV file is empty.');
        if (!rows[0].email || !rows[0].busNumber) {
          return setError('Invalid format. Please use the template provided.');
        }

        setUploading(true);

        // 1. Map CSV rows to MongoDB IDs
        const processedAssignments = [];
        const rowErrors = [];

        rows.forEach((row, index) => {
          const rowNum = index + 2; // +2 because header is row 1
          const email = row.email?.trim().toLowerCase();
          const busNumber = row.busNumber?.trim();
          
          const student = students.find(s => s.email.toLowerCase() === email);
          const bus = buses.find(b => b.busNumber.toLowerCase() === busNumber?.toLowerCase());
          
          if (!student) {
            rowErrors.push(`Row ${rowNum}: Student email not found (${email})`);
            return;
          }
          if (!bus) {
            rowErrors.push(`Row ${rowNum}: Bus number not found (${busNumber})`);
            return;
          }

          // Find route: either from CSV, or default to the bus's assigned route
          let route = routes.find(r => r.routeNumber?.toLowerCase() === row.routeNumber?.trim().toLowerCase());
          if (!route) {
             route = routes.find(r => r.busId?._id === bus._id || r.busId === bus._id);
          }
          
          if (!route) {
            rowErrors.push(`Row ${rowNum}: No route found for bus ${busNumber}`);
            return;
          }

          processedAssignments.push({
            studentId: student._id,
            busId: bus._id,
            routeId: route._id,
          });
        });

        if (processedAssignments.length === 0) {
          setUploading(false);
          setResult({ success: 0, failed: rowErrors.length, errors: rowErrors });
          return;
        }

        // 2. Send ONE bulk request to the backend
        try {
          const res = await axiosClient.post('/admin/assignments/bulk', {
            assignments: processedAssignments
          });
          
          setResult({ 
            success: res.insertedCount || processedAssignments.length, 
            failed: rowErrors.length + (res.errors?.length || 0), 
            errors: [...rowErrors, ...(res.errors || [])] 
          });
          
          if (onSuccess) onSuccess(); // Refresh parent list
        } catch (err) {
          setError(err?.message || 'Bulk upload failed on the server.');
        } finally {
          setUploading(false);
        }
      },
      error: () => {
        setParsing(false);
        setError('Failed to parse CSV file.');
      }
    });
  };

  return (
    <div className="bg-[#0c162b] border border-blue-500/30 rounded-2xl p-6 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" /> Bulk Assign Students
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {!result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-[#0e192f] p-3 rounded-xl border border-[#1b2b4c]">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition"
            >
              <Download className="w-3 h-3" /> Download Template
            </button>
            <p className="text-xs text-slate-400">Fill this in Excel and save as CSV.</p>
          </div>

          <div className="border-2 border-dashed border-[#1b2b4c] hover:border-blue-500/50 rounded-xl p-8 text-center transition cursor-pointer relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-slate-400 mb-2 mx-auto" />
            <span className="text-sm text-white font-semibold block">
              {file ? file.name : 'Click or drag CSV file here'}
            </span>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || parsing || uploading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition flex justify-center items-center gap-2"
          >
            {parsing ? 'Reading File...' : uploading ? 'Processing Bulk Upload...' : 'Upload & Assign'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-xs text-emerald-400 font-semibold">Successfully Assigned</p>
              <p className="text-2xl font-bold text-white">{result.success}</p>
            </div>
            <div className="flex-1 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
              <p className="text-xs text-rose-400 font-semibold">Failed / Skipped</p>
              <p className="text-2xl font-bold text-white">{result.failed}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-rose-400 mb-2">Error Details:</p>
              <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={() => { setResult(null); setFile(null); }}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}