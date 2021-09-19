const express = require('express')
const { v4: uuid } = require('uuid')
const app = express()

app.use(express.json())

// database
const customers = [];

// middleware
function existsAccount(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find(customer => customer.cpf === cpf)

    if(!customer) {
        return response.status(400).json({ error: 'customer not found'})
    }
    
    request.customer = customer;

    return next();
}

// helpers
function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if(operation.type === 'credit') {
            return acc + operation.amount
        } else {
            return acc - operation.amount
        }
    }, 0)

    return balance;
}

// account
app.get('/account', existsAccount, (request, response) => {
    const { customer } = request
    return response.status(200).json(customer)
})
app.post('/account', (request, response) => {
    const { cpf, name } = request.body;

    if(customers.some((customer) => customer.cpf === cpf)) return response.status(400).json({ error: 'customer already exists' })

    customers.push({
        id: uuid(),
        name: name,
        cpf: cpf,
        statement: []
    });

    response.status(201).send();
})
app.put('/account', existsAccount, (request, response) => {
    const { name } = request.body
    const { customer } = request

    customer.name = name

    return response.status(200).send()
})
app.delete('/account', existsAccount, (request, response) => {
    const { customer } = request

    customers.splice(customer, 1)

    return response.status(200).json(customers)
})

//movements and balance
app.get('/balance', existsAccount, (request, response) => {
    const { customer } = request
    const balance = getBalance(customer.statement)

    return response.json(balance)
})
app.get('/statement', existsAccount, (request, response) => {
    const { customer } = request;
    return response.json(customer.statement)
})
app.get('/statement/date', existsAccount, (request, response) => {
    const { customer } = request
    const { date } = request.query

    const dateFormat = new Date(date + " 00:00")

    const statement = customer.statement.filter(
        (statement) =>  {
            console.log(statement.created_at.toDateString() + ' === ' + new Date(dateFormat).toDateString())
            return statement.created_at.toDateString() === new Date(dateFormat).toDateString()
        }
    )

    return response.json(statement)
})
app.post('/deposit', existsAccount, (request, response) => {
    const { customer } = request
    const { description, amount } = request.body

    const operation = {
        description: description,
        amount: amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(operation);

    return response.status(201).send();
})
app.post('/withdraw', existsAccount, (request, response) => {
    const { customer } = request
    const { amount } = request.body

    const balance = getBalance(customer.statement)

    console.log(balance)

    if(balance < amount) return response.status(400).json('Insuficient funds!')


    const operation = {
        amount: amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(operation);

    return response.status(201).send();
})

app.listen(3333)