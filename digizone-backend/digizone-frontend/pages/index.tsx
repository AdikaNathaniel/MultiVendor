/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { GetServerSideProps, NextPage } from 'next';
import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Badge, Button, Card, Container } from 'react-bootstrap';
import styles from '../styles/Home.module.css';
import StarRatingComponent from 'react-star-rating-component';
import Router from 'next/router';
import axios from 'axios';
import ProductItem from '../components/Products/ProductItem';

interface Props {
	products: Record<string, any>;
}
const Home: NextPage<Props> = ({ products }) => {
	console.log('products :: ', products);

	return (
		<>
			<h3 className={styles.productCats}>Latest Products</h3>
			<Row xs={1} md={4} className='g-4'>
				{products.latestProducts &&
					products.latestProducts.map(
						(product: any, index: React.Key | null | undefined) => (
							<ProductItem
								product={product}
								userType={'customer'}
								key={index}
							/>
						)
					)}
			</Row>
			<hr />
			<h3 className={styles.productCats}>Top Rated Products</h3>
			<Row xs={1} md={4} className='g-4'>
				{products.topSoldProducts &&
					products.topSoldProducts.map(
						(product: any, index: React.Key | null | undefined) => (
							<ProductItem
								product={product}
								userType={'customer'}
								key={index}
							/>
						)
					)}
			</Row>
			<Row>
				<Col>
					<Button
						variant='primary'
						className={styles.viewMoreBtn}
						onClick={() => Router.push('/products')}
					>
						View More
					</Button>
				</Col>
			</Row>
		</>
	);
};

export const getServerSideProps: GetServerSideProps = async () => {
	try {
	  const { data } = await axios.get('http://localhost:3100/api/v1/products', {
		params: { dashboard: true }
		// Removed withCredentials since we don't need auth
	  });
	  
	  return {
		props: {
		  products: data?.result?.[0] || {}
		}
	  };
	} catch (error) {
	  console.error('Error fetching products:', error);
	  return { props: { products: {} } };
	}
  };
export default Home;
