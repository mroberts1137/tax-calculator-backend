# Tax Calculator Application

Backend for a MERN stack application for calculating US income tax returns with secure user authentication and form filling capabilities.

## Features

- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Personal Information Management**: Store and encrypt sensitive user data (SSN)
- **Tax Return Management**: Create and manage multiple tax returns
- **W-2 Data Entry**: Manual entry of W-2 information with field validation
- **Additional Income Sources**: Track interest, dividends, business income, rentals, capital gains, unemployment
- **Deduction Handling**: Support for both standard and itemized deductions
- **Tax Credit Calculation**: Child tax credit, earned income credit, and other credits
- **Accurate Tax Calculations**: Progressive tax brackets for all filing statuses (2020-2024)
- **IRS Rate Integration**: Infrastructure to fetch current rates from IRS Publication 1040

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT) with bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting (rate-limiter-flexible)
- **Encryption**: AES-256-GCM for sensitive data (SSN)
