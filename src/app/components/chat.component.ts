import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ChipModule } from 'primeng/chip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services
import { SmaApiService, ChatMessage } from '../services/sma-api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ScrollPanelModule,
    ChipModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  // Chat state
  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;
  isConnected = false;
  suggestedQuestions: string[] = [];

  // Subscriptions
  private connectionSubscription?: Subscription;

  constructor(
    private smaApiService: SmaApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeChat();
    this.subscribeToConnectionStatus();
    this.loadSuggestedQuestions();
    this.addWelcomeMessage();
  }

  ngOnDestroy(): void {
    this.connectionSubscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /**
   * Initialize chat and check API connection
   */
  private initializeChat(): void {
    this.smaApiService.checkConnection();
  }

  /**
   * Subscribe to connection status changes
   */
  private subscribeToConnectionStatus(): void {
    this.connectionSubscription = this.smaApiService.connectionStatus$.subscribe(
      status => {
        this.isConnected = status;
        if (!status) {
          this.showConnectionError();
        }
      }
    );
  }

  /**
   * Load suggested questions
   */
  private loadSuggestedQuestions(): void {
    this.suggestedQuestions = this.smaApiService.getSuggestedQuestions();
  }

  /**
   * Add welcome message
   */
  private addWelcomeMessage(): void {
    const welcomeMessage = this.smaApiService.createChatMessage(
      'Hello! I\'m your SMA Medical Assistant. I can help answer questions about Spinal Muscular Atrophy (SMA). How can I assist you today?',
      false,
      1.0
    );
    this.messages.push(welcomeMessage);
  }

  /**
   * Send a chat message
   */
  sendMessage(): void {
    if (this.isLoading) return;

    // Validate message
    const validation = this.smaApiService.validateMessage(this.currentMessage);
    if (!validation.isValid) {
      this.showError(validation.error || 'Invalid message');
      return;
    }

    // Check connection
    if (!this.isConnected) {
      this.showError('Not connected to the SMA Assistant API. Please check your connection.');
      return;
    }

    // Create user message
    const userMessage = this.smaApiService.createChatMessage(
      this.currentMessage,
      true
    );
    this.messages.push(userMessage);

    // Create loading message
    const loadingMessage = this.smaApiService.createChatMessage(
      'Thinking...',
      false,
      undefined,
      true
    );
    this.messages.push(loadingMessage);

    // Store current message and clear input
    const messageToSend = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;

    // Send to API
    this.smaApiService.sendMessage(messageToSend).subscribe({
      next: (response) => {
        this.handleSuccessResponse(response, loadingMessage);
      },
      error: (error) => {
        this.handleErrorResponse(error, loadingMessage);
      }
    });
  }

  /**
   * Handle successful API response
   */
  private handleSuccessResponse(response: any, loadingMessage: ChatMessage): void {
    // Remove loading message
    const loadingIndex = this.messages.indexOf(loadingMessage);
    if (loadingIndex > -1) {
      this.messages.splice(loadingIndex, 1);
    }

    // Create assistant response
    const assistantMessage = this.smaApiService.createChatMessage(
      response.answer,
      false,
      response.confidence
    );
    this.messages.push(assistantMessage);

    this.isLoading = false;
    this.focusInput();
  }

  /**
   * Handle API error response
   */
  private handleErrorResponse(error: any, loadingMessage: ChatMessage): void {
    // Remove loading message
    const loadingIndex = this.messages.indexOf(loadingMessage);
    if (loadingIndex > -1) {
      this.messages.splice(loadingIndex, 1);
    }

    // Create error message
    const errorMessage = this.smaApiService.createChatMessage(
      'I apologize, but I\'m having trouble processing your request right now. Please try again or contact a healthcare professional for immediate assistance.',
      false,
      0.0
    );
    this.messages.push(errorMessage);

    this.isLoading = false;
    this.showError(error.message || 'Failed to get response from SMA Assistant');
    this.focusInput();
  }

  /**
   * Send a suggested question
   */
  sendSuggestedQuestion(question: string): void {
    this.currentMessage = question;
    this.sendMessage();
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Clear chat history
   */
  clearChat(): void {
    this.messages = [];
    this.addWelcomeMessage();
    this.focusInput();
  }

  /**
   * Retry connection
   */
  retryConnection(): void {
    this.smaApiService.retryConnection().subscribe({
      next: () => {
        this.showSuccess('Connected to SMA Assistant API');
      },
      error: () => {
        this.showError('Still unable to connect to SMA Assistant API');
      }
    });
  }

  /**
   * Get confidence badge class
   */
  getConfidenceBadgeClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * Format confidence percentage
   */
  formatConfidence(confidence: number): string {
    return this.smaApiService.formatConfidence(confidence);
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  /**
   * Focus on input field
   */
  private focusInput(): void {
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }

  /**
   * Track messages by their ID for ngFor performance
   */
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  /**
   * Show connection error
   */
  private showConnectionError(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Connection Lost',
      detail: 'Lost connection to SMA Assistant API',
      life: 5000
    });
  }
}
