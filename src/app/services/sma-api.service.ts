import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

// Interfaces
export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  confidence?: number;
  isLoading?: boolean;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  answer: string;
  confidence: number;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmaApiService {
  private readonly baseUrl = 'http://localhost:8000/api';
  private readonly requestTimeout = 3000000; // 30 seconds

  // Connection status
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkConnection();
  }

  /**
   * Send a chat message to the SMA assistant
   */
  sendMessage(message: string): Observable<ChatResponse> {
    const request: ChatRequest = { message: message.trim() };
    
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, request)
      .pipe(
        timeout(this.requestTimeout),
        map(response => ({
          ...response,
          timestamp: response.timestamp || new Date().toISOString()
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Check API health status
   */
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`)
      .pipe(
        timeout(5000), // 5 second timeout for health check
        catchError(this.handleError)
      );
  }

  /**
   * Check connection status periodically
   */
  checkConnection(): void {
    this.checkHealth().subscribe({
      next: () => {
        this.connectionStatusSubject.next(true);
      },
      error: () => {
        this.connectionStatusSubject.next(false);
      }
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connectionStatusSubject.value;
  }

  /**
   * Retry connection check
   */
  retryConnection(): Observable<HealthResponse> {
    return this.checkHealth().pipe(
      map(response => {
        this.connectionStatusSubject.next(true);
        return response;
      }),
      catchError(error => {
        this.connectionStatusSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to the SMA Assistant API. Please check if the server is running.';
          break;
        case 400:
          errorMessage = 'Invalid request. Please check your message and try again.';
          break;
        case 422:
          errorMessage = 'Invalid message format. Please enter a valid question.';
          break;
        case 500:
          errorMessage = 'Server error. The SMA Assistant is temporarily unavailable.';
          break;
        case 503:
          errorMessage = 'Service unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('SMA API Error:', error);
    this.connectionStatusSubject.next(false);
    
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Create a chat message object
   */
  createChatMessage(
    message: string, 
    isUser: boolean, 
    confidence?: number,
    isLoading: boolean = false
  ): ChatMessage {
    return {
      id: this.generateMessageId(),
      message,
      isUser,
      timestamp: new Date(),
      confidence,
      isLoading
    };
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format confidence score for display
   */
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Get confidence color based on score
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10b981'; // green
    if (confidence >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }

  /**
   * Validate message before sending
   */
  validateMessage(message: string): { isValid: boolean; error?: string } {
    const trimmed = message.trim();
    
    if (!trimmed) {
      return { isValid: false, error: 'Please enter a message' };
    }
    
    if (trimmed.length < 3) {
      return { isValid: false, error: 'Message is too short' };
    }
    
    if (trimmed.length > 2000) {
      return { isValid: false, error: 'Message is too long (max 2000 characters)' };
    }
    
    return { isValid: true };
  }

  /**
   * Get suggested questions for SMA
   */
  getSuggestedQuestions(): string[] {
    return [
      'What is Spinal Muscular Atrophy (SMA)?',
      'What are the different types of SMA?',
      'What are the symptoms of SMA?',
      'How is SMA diagnosed?',
      'What treatments are available for SMA?',
      'What is the prognosis for SMA patients?',
      'How is SMA inherited?',
      'What support resources are available for SMA families?'
    ];
  }
}
