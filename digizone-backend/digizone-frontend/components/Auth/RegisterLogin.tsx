/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { FC, useContext, useEffect } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { Users } from '../../services/user.service';
import { useToasts } from 'react-toast-notifications';
import { resposnePayload } from '../../services/api';
import validator from 'validator';
import Router from 'next/router';
import { Context } from '../../context';

interface IRegisterLoginProps {
	isResgisterForm?: boolean;
}

const initalForm = {
	email: '',
	password: '',
	confirmPassword: '',
	name: '',
	role: 'Customer', // Default role
};

const RegisterLogin: FC<IRegisterLoginProps> = ({ isResgisterForm = false }) => {
	const { addToast } = useToasts();
	const [authForm, setAuthForm] = React.useState(initalForm);
	const [isLoading, setIsLoading] = React.useState(false);
	const [otpTime, setOtpTime] = React.useState(false);
	const [otpForm, setOtpForm] = React.useState({ email: '', otp: '' });

	const {
		state: { user },
		dispatch,
	} = useContext(Context);

	useEffect(() => {
		if (user && user.email) {
			Router.push('/my-account'); // Redirect if already logged in
		}
	}, [user]);

	// Handle register form
	const handleRegister = async (e: any) => {
		e.preventDefault();
		try {
			const { email, name, password, confirmPassword, role } = authForm;
			if (!name) {
				throw new Error('Invalid name');
			}
			if (!validator.isEmail(email)) {
				throw new Error('Invalid email');
			}
			if (password !== confirmPassword) {
				throw new Error('Password does not match');
			}
			if (password.length < 6) {
				throw new Error('Password is too short. Minimum 6 characters');
			}
			setIsLoading(true);

			const payload = {
				email,
				password,
				name,
				role,
			};

			const { success, message }: resposnePayload = await Users.registerNewUser(payload);
			if (!success) throw new Error(message);

			setOtpForm({ ...otpForm, email });
			setOtpTime(true);
			setAuthForm(initalForm);
			addToast(message, { appearance: 'success', autoDismiss: true });
		} catch (error: any) {
			addToast(error.message, { appearance: 'error', autoDismiss: true });
		} finally {
			setIsLoading(false);
		}
	};

	// Handle login form
	const handleLogin = async (e: any) => {
		e.preventDefault();
		try {
			const { email, password, role } = authForm;
			if (!email || !password) {
				throw new Error('Invalid email or password');
			}
			if (!validator.isEmail(email)) {
				throw new Error('Invalid email');
			}
			if (password.length < 6) {
				throw new Error('Password is too short. Minimum 6 characters');
			}
			setIsLoading(true);

			const payload = {
				email,
				password,
				role,
			};

			const { success, message, result }: resposnePayload = await Users.loginUser(payload);
			if (!success) throw new Error(message);

			dispatch({
				type: 'LOGIN',
				payload: result?.user,
			});
			addToast(message, { appearance: 'success', autoDismiss: true });
			Router.push('/');
		} catch (error: any) {
			addToast(error.message, { appearance: 'error', autoDismiss: true });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<Card.Header>{isResgisterForm ? 'Register' : 'Login'}</Card.Header>
			<Card.Body>
				<Form>
					{isResgisterForm && (
						<Form.Group className="mb-3">
							<Form.Label>Full name</Form.Label>
							<Form.Control
								type="text"
								name="name"
								placeholder="Enter your full name"
								disabled={otpTime}
								value={authForm.name || ''}
								onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
							/>
						</Form.Group>
					)}
					<Form.Group className="mb-3">
						<Form.Label>Email address</Form.Label>
						<Form.Control
							type="email"
							placeholder="name@example.com"
							name="email"
							disabled={otpTime}
							value={authForm.email || ''}
							onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
						/>
					</Form.Group>
					<Form.Group className="mb-3">
						<Form.Label>Password</Form.Label>
						<Form.Control
							type="password"
							name="password"
							placeholder="Enter your password"
							disabled={otpTime}
							value={authForm.password || ''}
							onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
						/>
					</Form.Group>

					<Form.Group className="mb-3">
								<Form.Label>Role</Form.Label>
								<Form.Control
									as="select"
								>
									<option value="Customer">Customer</option>
									<option value="Seller1">Seller1</option>
									<option value="Seller2">Seller2</option>
									<option value="Seller3">Seller3</option>
								</Form.Control>
						</Form.Group>
					{isResgisterForm && (
						<>
							<Form.Group className="mb-3">
								<Form.Label>Re-type password</Form.Label>
								<Form.Control
									type="password"
									name="repassword"
									placeholder="Re-type your password"
									disabled={otpTime}
									value={authForm.confirmPassword || ''}
									onChange={(e) =>
										setAuthForm({ ...authForm, confirmPassword: e.target.value })
									}
								/>
							</Form.Group>
						</>
					)}
					<Form.Group className="mb-3">
						<Button
							variant="info"
							type="submit"
							className="btnAuth"
							disabled={isLoading}
							onClick={isResgisterForm ? handleRegister : handleLogin}
						>
							{isResgisterForm ? 'Register' : 'Login'}
						</Button>
					</Form.Group>
				</Form>
				{!isResgisterForm && (
					<a style={{ textDecoration: 'none' }} href="" onClick={(e) => e.preventDefault()}>
						Forgot your password?
					</a>
				)}
			</Card.Body>
		</Card>
	);
};

export default RegisterLogin;
