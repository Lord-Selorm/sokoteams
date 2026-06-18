import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FormInput from '@/components/common/FormInput';

describe('FormInput', () => {
  it('renders with label text', () => {
    render(<FormInput label="Email" value="" onChange={() => {}} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<FormInput label="Email" value="" onChange={() => {}} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<FormInput label="Password" type="password" value="secret" onChange={() => {}} />);
    const input = screen.getByDisplayValue('secret');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('calls onChange with value', () => {
    let value = '';
    const onChange = (v: string) => { value = v; };
    render(<FormInput label="Name" value={value} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'John' } });
    expect(value).toBe('John');
  });
});
