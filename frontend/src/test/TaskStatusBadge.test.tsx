import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge';

describe('TaskStatusBadge', () => {
  it('renders Todo status', () => {
    render(<TaskStatusBadge status="Todo" />);
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('renders InProgress status', () => {
    render(<TaskStatusBadge status="InProgress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders Done status', () => {
    render(<TaskStatusBadge status="Done" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders Blocked status', () => {
    render(<TaskStatusBadge status="Blocked" />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });
});
