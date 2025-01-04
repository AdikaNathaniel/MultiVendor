/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GetServerSideProps } from 'next';
import type { NextPage } from 'next';
import queryString from 'query-string';
import { Col, Dropdown, DropdownButton, Row } from 'react-bootstrap';
import { PlusCircle } from 'react-bootstrap-icons';
import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToasts } from 'react-toast-notifications';
import { useRouter } from 'next/router';
import axios from 'axios';
import BreadcrumbDisplay from '../../components/shared/BreadcrumbDisplay';
import PaginationDisplay from '../../components/shared/PaginationDisplay';
import ProductItem from '../../components/Products/ProductItem';
import ProductFilter from '../../components/Products/ProductFilter';
import { Context } from '../../context';
import styles from '../../styles/Product.module.css';

interface Props {
  products: Record<string, any>[];
  metadata: Record<string, any>;
}

const AllProducts: NextPage<Props> = ({ products, metadata }) => {
  const { addToast } = useToasts();
  const [userType, setUserType] = useState('customer');
  const router = useRouter();

  const {
    state: { user },
  } = useContext(Context);

  useEffect(() => {
    if (user && user.email) {
      setUserType(user.type);
    }
  }, [user]);

  return (
    <>
      <Row>
        <Col md={8}>
          <BreadcrumbDisplay
            childrens={[
              {
                active: false,
                href: '/',
                text: 'Home',
              },
              {
                active: true,
                href: '',
                text: 'Products',
              },
            ]}
          />
        </Col>
        <Col md={4}>
          <DropdownButton
            variant='outline-secondary'
            title='Sort By'
            id='input-group-dropdown-2'
            className={styles.dropdownBtn}
            onSelect={(e) => {
              if (e) {
                router.query.sort = e;
                router.push(router);
              } else {
                delete router.query.sort;
                router.push(router);
              }
            }}
          >
            <Dropdown.Item href='#' eventKey='-avgRating'>
              Rating
            </Dropdown.Item>
            <Dropdown.Item href='#' eventKey='-createdAt'>
              Latest
            </Dropdown.Item>
          </DropdownButton>
          {userType === 'admin' && (
            <Link href='/products/update-product' className={`btn btn-primary ${styles.btnAddProduct}`}>
              <PlusCircle className={styles.btnAddProductIcon} />
              Add Product
            </Link>
          )}
        </Col>
      </Row>
      <Row>
        <Col sm={2}>
          <ProductFilter />
        </Col>
        <Col sm={10}>
          <Row xs={1} md={3} className='g-3'>
            {products && products.length > 0 ? (
              products.map((product: Record<string, any>) => (
                <ProductItem
                  key={product._id}
                  userType={userType}
                  product={product}
                />
              ))
            ) : (
              <h1>No Products</h1>
            )}
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>
          <PaginationDisplay metadata={metadata} />
        </Col>
      </Row>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';
    
    // Build URL with query parameters
    const url = queryString.stringifyUrl({
      url: `${API_URL}/api/v1/products`,
      query: context.query,
    });

    // Make request to get products without authentication
    const { data } = await axios.get(url);

    return {
      props: {
        products: data?.result?.products || [],
        metadata: data?.result?.metadata || {},
      },
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      props: {
        products: [],
        metadata: {},
      },
    };
  }
};

export default AllProducts;