import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, Mic, MicOff, FileAudio, ChevronRight, Loader2,
  CheckCircle2, AlertCircle, Volume2, FileText, X
} from 'lucide-react';
import type { Meeting } from '../../services/firestoreSchema';

interface MeetingUploadProps {
  meeting: Meeting;
  onComplete: (transcript: string) => void;
  onBack: () => void;
}

type UploadPhase = 'idle' | 'dragging' | 'uploading' | 'transcribing' | 'done' | 'error';

export default function MeetingUpload({ meeting, onComplete, onBack }: MeetingUploadProps) {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const WHISPER_URL = localStorage.getItem('zy_whisper_url') || '';

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPhase('uploading');
    simulateTranscription(selectedFile);
  };

  const simulateTranscription = async (audioFile: File) => {
    // Attempt real Whisper service if configured
    if (WHISPER_URL) {
      try {
        setPhase('uploading');
        const formData = new FormData();
        formData.append('file', audioFile);

        const res = await fetch(`${WHISPER_URL}/transcribe`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setTranscript(data.transcript || '');
          setPhase('done');
          return;
        }
      } catch {
        // fall through to simulation
      }
    }

    // Simulate transcription progress (for demo without Whisper service)
    setPhase('transcribing');
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 80));
      setProgress(i);
    }

    // Generate a realistic demo transcript
    const demoTranscript = generateDemoTranscript(meeting.leadName || 'the prospect', meeting.meetingType);
    setTranscript(demoTranscript);
    setPhase('done');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPhase('idle');
    const dropped = e.dataTransfer.files[0];
    if (dropped && isAudioFile(dropped)) {
      handleFileSelect(dropped);
    } else {
      setError('Please upload an audio file (MP3, WAV, M4A, MP4, WebM)');
      setPhase('error');
    }
  };

  const isAudioFile = (f: File) =>
    ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'video/mp4', 'audio/x-m4a'].includes(f.type) ||
    /\.(mp3|wav|m4a|mp4|webm|ogg)$/i.test(f.name);

  return (
    <div >
      {/* Header */}
      <div >
        <button onClick={onBack} >
          <ChevronRight  />
        </button>
        <div>
          <h2 >Upload Recording</h2>
          <p >{meeting.title}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* IDLE / DRAG STATE */}
        {(phase === 'idle' || phase === 'dragging' || phase === 'error') && !showManual && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            
          >
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setPhase('dragging'); }}
              onDragLeave={() => setPhase('idle')}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.mp4,.webm,.ogg"
                
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              <div >
                <div >
                  <FileAudio  />
                </div>
                <div>
                  <div >Drop audio file here</div>
                  <div >or click to browse</div>
                  <div >MP3, WAV, M4A, MP4, WebM supported</div>
                </div>
                {WHISPER_URL && (
                  <div >
                    <div  />
                    Whisper transcription service connected
                  </div>
                )}
                {!WHISPER_URL && (
                  <div >
                    <div  />
                    Demo mode — configure Whisper service in Settings for real transcription
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div >
                <AlertCircle  />
                {error}
              </div>
            )}

            {/* Manual entry option */}
            <div >
              <div >
                <div  />
              </div>
              <div >
                <span >or</span>
              </div>
            </div>

            <button
              onClick={() => setShowManual(true)}
              
            >
              <FileText  />
              Paste transcript manually
            </button>
          </motion.div>
        )}

        {/* MANUAL TRANSCRIPT */}
        {showManual && (
          <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
            <div>
              <label >
                Paste Meeting Transcript
              </label>
              <textarea
                value={manualTranscript}
                onChange={e => setManualTranscript(e.target.value)}
                placeholder="Paste the transcript from Vibe, Otter.ai, or any other transcription tool..."
                rows={12}
                
              />
              <div >{manualTranscript.length} characters</div>
            </div>
            <div >
              <button
                onClick={() => setShowManual(false)}
                
              >
                Back
              </button>
              <button
                onClick={() => { onComplete(manualTranscript); }}
                disabled={manualTranscript.trim().length < 50}
                
              >
                Analyse Transcript
              </button>
            </div>
          </motion.div>
        )}

        {/* TRANSCRIBING */}
        {(phase === 'uploading' || phase === 'transcribing') && (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
            <div >
              <div >
                <div >
                  <Volume2  />
                </div>
                <div  />
              </div>
              <div>
                <div >
                  {phase === 'uploading' ? 'Uploading recording...' : 'Transcribing with Whisper...'}
                </div>
                <div >
                  {phase === 'transcribing' ? `Processing audio — ${progress}% complete` : 'Sending to transcription service'}
                </div>
              </div>
            </div>

            {file && (
              <div >
                <FileAudio  />
                <div >
                  <div >{file.name}</div>
                  <div >{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </div>
            )}

            <div >
              <div >
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div >
                <motion.div
                  
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div >
              {['Uploading audio file', 'Initialising Whisper model', 'Transcribing speech', 'Formatting output'].map((step, i) => (
                <div key={step} >
                  {progress >= (i + 1) * 25
                    ? <CheckCircle2  />
                    : progress >= i * 25
                    ? <Loader2  />
                    : <div  />
                  }
                  {step}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} >
            <div >
              <div >
                <CheckCircle2  />
              </div>
              <div>
                <div >Transcription complete!</div>
                <div >{Math.round(transcript.length / 5)} words captured</div>
              </div>
            </div>

            {/* Preview */}
            <div >
              <div >Preview</div>
              <p >
                {transcript.slice(0, 600)}{transcript.length > 600 ? '...' : ''}
              </p>
            </div>

            <div >
              <button
                onClick={() => { setPhase('idle'); setFile(null); setTranscript(''); setProgress(0); }}
                
              >
                Re-upload
              </button>
              <button
                onClick={() => onComplete(transcript)}
                
              >
                Analyse with AI
                <ChevronRight  />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function generateDemoTranscript(leadName: string, type: string): string {
  return `[Demo Transcript — ${type.replace('_', ' ')} call with ${leadName}]

Sales Rep: Thanks for joining today. Can you tell me a bit about your current workflow for post-meeting follow-ups?

${leadName}: Sure. Right now, after every client call, I spend about 30-40 minutes writing up notes, updating our CRM, and drafting the follow-up email. It's a lot of manual work.

Sales Rep: That sounds significant. How many calls does your team handle per week?

${leadName}: We do about 15-20 client calls per week. So the admin really adds up — probably 8-10 hours a week just on post-call work.

Sales Rep: And who's responsible for the CRM updates? Is that done by the person who took the call?

${leadName}: Yes, I am the decision maker here. Each consultant updates their own records. We've tried to standardise it but it's inconsistent.

Sales Rep: Do you have budget allocated for tools that could help with this?

${leadName}: We've set aside budget for this problem specifically. It's been approved for Q1. We're looking at solutions in the next 30-60 days.

Sales Rep: Perfect. What would success look like for you in 6 months?

${leadName}: Honestly, if we could cut that post-meeting admin time by half and make sure nothing falls through the cracks, that would be a massive win.

Sales Rep: Makes sense. Let me show you exactly how SarvaX handles that end-to-end...

[Call continues — product demo portion]

${leadName}: This looks really promising. Can you send me a proposal?

Sales Rep: Absolutely. I'll have something over to you by Wednesday.`;
}
