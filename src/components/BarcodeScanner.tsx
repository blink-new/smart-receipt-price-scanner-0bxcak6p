import { useState, useRef, useEffect } from 'react'
import { Camera, X, Scan, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import blink from '../blink/client'

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onBarcodeScanned, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setCameraReady(false)
    }
  }

  const startCamera = async () => {
    try {
      setError(null)
      setCameraReady(false)
      
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
      
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser')
      }

      // Start with basic constraints for better compatibility
      let mediaStream: MediaStream
      
      try {
        // Try with environment camera first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
      } catch (envError) {
        console.warn('Environment camera failed, trying any camera:', envError)
        // Fallback to any available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        })
      }
      
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Simple approach - wait for loadedmetadata then play
        const handleVideoReady = async () => {
          try {
            if (videoRef.current && mediaStream.active) {
              await videoRef.current.play()
              setCameraReady(true)
              setError(null)
            }
          } catch (playError) {
            console.error('Failed to play video:', playError)
            setError('Failed to start camera preview. Please try again.')
          }
        }
        
        if (videoRef.current.readyState >= 2) {
          // Video is already loaded
          handleVideoReady()
        } else {
          // Wait for video to load
          videoRef.current.addEventListener('loadedmetadata', handleVideoReady, { once: true })
          
          // Fallback timeout
          setTimeout(() => {
            if (videoRef.current && !cameraReady && mediaStream.active) {
              handleVideoReady()
            }
          }, 3000)
        }
      }
    } catch (error: any) {
      console.error('Failed to start camera:', error)
      
      let errorMessage = 'Failed to access camera.'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure your device has a camera.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported by this browser.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.'
      }
      
      setError(errorMessage)
    }
  }

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array is intentional - we only want to start camera once

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      setError('Camera not ready. Please wait for camera to load.')
      return
    }

    setIsScanning(true)
    setError(null)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Failed to get canvas context')
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create image blob'))
        }, 'image/jpeg', 0.8)
      })

      // Create file from blob
      const file = new File([blob], 'barcode-scan.jpg', { type: 'image/jpeg' })

      // Upload to storage to get public URL
      const { publicUrl } = await blink.storage.upload(
        file,
        `barcode-scans/${Date.now()}-scan.jpg`,
        { upsert: true }
      )

      // Use AI vision to extract barcode from image
      const { text: extractedText } = await blink.ai.generateText({
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Look at this image and extract any barcode numbers you can see. Look for UPC codes, EAN codes, or any numeric barcodes. Return only the barcode number(s), nothing else. If you see multiple barcodes, return the clearest/largest one." 
              },
              { type: "image", image: publicUrl }
            ]
          }
        ]
      })

      // Clean up the extracted text to get just the barcode number
      const barcodeMatch = extractedText.match(/\d{8,14}/)
      
      if (barcodeMatch) {
        const barcode = barcodeMatch[0]
        onBarcodeScanned(barcode)
        onClose()
      } else {
        setError('No barcode detected in image. Please try again with better lighting or positioning.')
      }
    } catch (error) {
      console.error('Failed to analyze barcode:', error)
      setError('Failed to analyze barcode. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  const retryCamera = () => {
    stopCamera()
    setTimeout(() => {
      startCamera()
    }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Scan Barcode
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
              autoPlay
              style={{ 
                transform: 'scaleX(-1)', // Mirror for better UX
                backgroundColor: '#000' // Prevent white flash
              }}
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Loading overlay */}
            {!cameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <span className="text-sm">Starting camera...</span>
                </div>
              </div>
            )}
            
            {/* Scanning overlay */}
            {cameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white border-dashed w-48 h-24 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                    Position barcode here
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {error.includes('Camera') && (
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={retryCamera}>
                      Retry Camera
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Position the barcode within the frame</p>
            <p>• Ensure good lighting</p>
            <p>• Hold steady and tap "Scan" when ready</p>
          </div>

          {/* Scan Button */}
          <Button 
            onClick={captureAndAnalyze} 
            disabled={isScanning || !cameraReady || !!error}
            className="w-full"
          >
            {isScanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Scan Barcode
              </>
            )}
          </Button>

          {/* Manual Entry Option */}
          <div className="text-center">
            <Button variant="outline" onClick={onClose} className="text-sm">
              Enter barcode manually instead
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}