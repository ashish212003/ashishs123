import React, { useState, useEffect } from 'react';

function App() {
  const [mode, setMode] = useState('host'); // 'host' or 'device'
  const [roomId, setRoomId] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const API_BASE = 'http://localhost:5000';

  // Generate a new room ID (UUID v4)
  const generateRoomId = () => {
    // Simple UUID generator (not cryptographic)
    return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Host: generate room ID on mount
  useEffect(() => {
    if (mode === 'host' && !roomId) {
      const newId = generateRoomId();
      setRoomId(newId);
    }
  }, [mode, roomId]);

  // Host: Fetch files list periodically to update UI
  useEffect(() => {
    let interval;
    if (mode === 'host' && roomId) {
      const fetchFiles = async () => {
        try {
          const res = await fetch(`${API_BASE}/rooms/${roomId}/files`);
          if (!res.ok) throw new Error('Error fetching files');
          const data = await res.json();
          setFiles(data);
        } catch (err) {
          setErrorMessage('Failed to fetch files from server.');
        }
      };
      fetchFiles();
      interval = setInterval(fetchFiles, 5000);
    }
    return () => clearInterval(interval);
  }, [mode, roomId]);

  // Device: handle file select
  const onFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Device: handle upload file
  const uploadFile = async () => {
    if (!roomId) {
      setErrorMessage('Please enter a Room ID');
      return;
    }
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload');
      return;
    }
    setErrorMessage('');
    setUploadStatus('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE}/rooms/${roomId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errRes = await res.json();
        throw new Error(errRes.message || 'Upload failed');
      }
      const data = await res.json();
      setUploadStatus(`Uploaded "${data.originalName}" successfully`);
      setSelectedFile(null);
      // Reset file input value to allow re-upload same file if needed
      document.getElementById('fileInput').value = '';
    } catch (err) {
      setUploadStatus('');
      setErrorMessage(err.message);
    }
  };

  const containerStyle = {
    maxWidth: 600,
    margin: '30px auto',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: 20,
    borderRadius: 8,
    boxShadow: '0 0 20px rgba(0,0,0,0.1)',
    backgroundColor: '#f9f9f9',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  };

  const buttonStyle = {
    margin: '5px',
    padding: '8px 16px',
    fontSize: 16,
    borderRadius: 5,
    border: 'none',
    cursor: 'pointer',
    color: 'white',
  };

  const hostBtnStyle = {
    ...buttonStyle,
    backgroundColor: mode === 'host' ? '#4caf50' : '#8bc34a',
  };

  const deviceBtnStyle = {
    ...buttonStyle,
    backgroundColor: mode === 'device' ? '#2196f3' : '#64b5f6',
  };

  const inputStyle = {
    padding: 10,
    fontSize: 16,
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 5,
    border: '1px solid #ccc',
    marginTop: 10,
    marginBottom: 10,
  };

  const fileListStyle = {
    listStyle: 'none',
    paddingLeft: 0,
    maxHeight: 200,
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: 5,
    backgroundColor: 'white',
  };

  const fileItemStyle = {
    padding: '10px 15px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const linkStyle = {
    color: '#2196f3',
    textDecoration: 'none',
    fontWeight: 'bold',
  };

  const errorStyle = {
    color: 'red',
    marginTop: 10,
    marginBottom: 10,
  };

  const infoStyle = {
    color: 'green',
    marginTop: 10,
    marginBottom: 10,
  };

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>WiFi File Exchange</h1>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          style={hostBtnStyle}
          onClick={() => {
            setMode('host');
            setErrorMessage('');
            setUploadStatus('');
          }}
        >
          Host
        </button>
        <button
          style={deviceBtnStyle}
          onClick={() => {
            setMode('device');
            setErrorMessage('');
            setUploadStatus('');
          }}
        >
          Device
        </button>
      </div>

      {mode === 'host' && (
        <>
          <h2>Your Room ID</h2>
          <input
            style={inputStyle}
            type="text"
            readOnly
            value={roomId}
            onClick={(e) => e.target.select()}
          />
          <p>Share this Room ID with the device to send files.</p>
          <h3>Files Received</h3>
          {files.length === 0 && <p>No files uploaded yet.</p>}
          <ul style={fileListStyle}>
            {files.map((file) => (
              <li key={file.id} style={fileItemStyle}>
                <span>{file.originalName}</span>
                <a
                  style={linkStyle}
                  href={`${API_BASE}/rooms/${roomId}/files/${file.id}`}
                  download={file.originalName}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {mode === 'device' && (
        <>
          <h2>Send File</h2>
          <label>
            Room ID:
            <input
              style={inputStyle}
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
            />
          </label>
          <label>
            Select file:
            <input
              id="fileInput"
              type="file"
              onChange={onFileChange}
              style={{ marginTop: 10, marginBottom: 10 }}
            />
          </label>
          <button
            style={{ ...buttonStyle, backgroundColor: '#2196f3', width: '100%' }}
            onClick={uploadFile}
          >
            Upload
          </button>
          {uploadStatus && <p style={infoStyle}>{uploadStatus}</p>}
        </>
      )}

      {errorMessage && <p style={errorStyle}>{errorMessage}</p>}
    </div>
  );
}

export default App;
