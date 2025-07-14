import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MCPChat from './MCPChat';
import { MCPContext } from '../contexts/MCPContext';
import { MCPQuestion } from '../types';
import { ThemeProvider, createTheme } from '@mui/material';

// Create a theme for Material-UI components
const theme = createTheme();

// Mock SendIcon from Material-UI
jest.mock('@mui/icons-material/Send', () => {
  return {
    __esModule: true,
    default: () => <span data-testid="send-icon">Send</span>
  };
});

// Mock the useMCP hook context
const mockSubmitAnswer = jest.fn();
const mockSetIsReplyingToMCP = jest.fn();
const mockSetCurrentMCPQuestionId = jest.fn();

describe('MCPChat Component', () => {
  const renderWithMCPContext = (contextValue: any) => {
    return render(
      <ThemeProvider theme={theme}>
        <MCPContext.Provider value={contextValue}>
          <MCPChat />
        </MCPContext.Provider>
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the component with server starting message when server is not running', () => {
    renderWithMCPContext({
      currentQuestion: null,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: false,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: null,
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    expect(screen.getByText('Agent-User Chat via MCP')).toBeInTheDocument();
    expect(screen.getByText('Starting MCP server...')).toBeInTheDocument();
    expect(screen.getByText('This tab allows agents to ask you questions through the MCP server.')).toBeInTheDocument();
  });

  test('renders the component without server starting message when server is running', () => {
    renderWithMCPContext({
      currentQuestion: null,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: true,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: null,
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    expect(screen.getByText('Agent-User Chat via MCP')).toBeInTheDocument();
    expect(screen.queryByText('Starting MCP server...')).not.toBeInTheDocument();
  });

  test('does not submit when no question is available', () => {
    renderWithMCPContext({
      currentQuestion: null,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: true,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: null,
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    const inputField = screen.getByPlaceholderText('Waiting for a question...');
    fireEvent.change(inputField, { target: { value: 'Test answer' } });

    const form = screen.getByTestId('mcp-form');
    fireEvent.submit(form);
    
    expect(mockSubmitAnswer).not.toHaveBeenCalled();
  });

  test('input field is enabled when there is a current question', () => {
    const mockQuestion: MCPQuestion = {
      id: 'test_question_id',
      question: 'Test question?'
    };

    renderWithMCPContext({
      currentQuestion: mockQuestion,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: true,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: 'test_question_id',
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    const inputField = screen.getByPlaceholderText('Your reply...');
    expect(inputField).not.toBeDisabled();
    
    // Send button should still be disabled when input is empty
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  test('shows warning alert when there is a current question', () => {
    const mockQuestion: MCPQuestion = {
      id: 'test_question_id',
      question: 'Test question?'
    };

    renderWithMCPContext({
      currentQuestion: mockQuestion,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: true,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: 'test_question_id',
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    expect(screen.getByText('Please answer the question above.')).toBeInTheDocument();
  });

  test('submits answer when form is submitted with input', async () => {
    const mockQuestion: MCPQuestion = {
      id: 'test_question_id',
      question: 'Test question?'
    };

    renderWithMCPContext({
      currentQuestion: mockQuestion,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: true,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: 'test_question_id',
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    const inputField = screen.getByPlaceholderText('Your reply...');
    await userEvent.type(inputField, 'Test answer');
    
    // Find the submit button
    const sendButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendButton);
    
    expect(mockSubmitAnswer).toHaveBeenCalledWith('Test answer');
  });

  test('does not submit when form is submitted with empty input', () => {
    const mockQuestion: MCPQuestion = {
      id: 'test_question_id',
      question: 'Test question?'
    };

    renderWithMCPContext({
      currentQuestion: mockQuestion,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: true,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: 'test_question_id',
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    // Get the form element by its class name instead of role
    const form = screen.getByTestId('mcp-form');
    fireEvent.submit(form);
    
    expect(mockSubmitAnswer).not.toHaveBeenCalled();
  });

  test('clears input after submitting answer', async () => {
    const mockQuestion: MCPQuestion = {
      id: 'test_question_id',
      question: 'Test question?'
    };

    renderWithMCPContext({
      currentQuestion: mockQuestion,
      submitAnswer: mockSubmitAnswer,
      isServerRunning: true,
      isReplyingToMCP: false,
      setIsReplyingToMCP: mockSetIsReplyingToMCP,
      currentMCPQuestionId: 'test_question_id',
      setCurrentMCPQuestionId: mockSetCurrentMCPQuestionId
    });

    const inputField = screen.getByPlaceholderText('Your reply...');
    await userEvent.type(inputField, 'Test answer');
    
    // Find the submit button
    const sendButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendButton);
    
    expect(inputField).toHaveValue('');
  });
});
