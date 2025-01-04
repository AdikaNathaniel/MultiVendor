import React from 'react';
// import { Button } from 'react-bootstrap';
import {  Col,  Row } from 'react-bootstrap';
// import { Card} from 'react-bootstrap';
// import { Form } from 'react-bootstrap';
import RegisterLogin from '../components/Auth/RegisterLogin';

const Auth = () => {
	return (
		<Row>
			<Col sm={6} className="mt-3">
				<RegisterLogin />
			</Col>
			<Col sm={6} className="mt-3">
				<RegisterLogin isResgisterForm={true} />
			</Col>
		</Row>
	);
};

export default Auth;
