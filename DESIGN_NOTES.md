# Design Notes

## Architecture Overview

This Order Service API follows a layered architecture pattern with clear separation of concerns:

```
Client → Routes → Controllers → Services → Repositories → MongoDB
```

## Key Architectural Decisions

### 1. Repository Pattern

**Why:** Decouples business logic from data access
- Repositories handle all MongoDB operations
- Services contain only business logic
- Easy to swap data source or add caching

**Decision:** Each entity has its own repository with clean interface

### 2. Service Layer Pattern

**Why:** Encapsulates business logic
- All business rules in one place
- Controllers remain thin and focused on HTTP handling
- Enables easy testing of business logic

**Decision:** Services coordinate between repositories and handle validation/transformations

### 3. Transaction Management

**Why:** Critical for data consistency
- Order creation + stock deduction must be atomic
- Order cancellation + stock restoration must be atomic

**Decision:** Using MongoDB transactions via Mongoose session

```typescript
await orderRepository.withTransaction(async (session) => {
  // All operations within this callback share the same session
  // If any operation fails, entire transaction is rolled back
});
```

### 4. Input Validation

**Why:** Security and data integrity
- Prevent invalid data from reaching business logic
- Clear error messages for API consumers

**Decision:** Zod for schema validation
- Type-safe validation
- Clear error format with field names
- Automatic TypeScript inference

### 5. Error Handling

**Why:** Consistent error responses
- Different error types (validation, auth, not found, etc.)
- Proper HTTP status codes
- Stack traces only in development

**Decision:** Centralized error middleware with custom error classes

### 6. Authentication & Authorization

**Why:** Security
- JWT for stateless authentication
- Role-based access control

**Decision:** 
- JWT stored in Authorization header (Bearer token)
- Middleware extracts and verifies token
- Separate authorize middleware for role checking

### 7. Order Status Management

**Why:** Business logic clarity
- Clear state machine for orders
- Idempotent operations

**Decision:**
- Status: `created` → `paid` → `cancelled`
- Payment is idempotent (returning 200 if already paid)
- Cancellation restores stock atomically

### 8. Stock Management

**Why:** Prevent overselling
- Atomic updates with transactions
- Validation before order creation

**Decision:**
- Check stock availability before creating order
- Deduct stock within the same transaction
- Restore stock on cancellation

### 9. Price Storage

**Why:** Historical accuracy
- Prices can change over time
- Orders should reflect price at time of purchase

**Decision:**
- Store `unitPrice` on order item
- Capture current product price when order is created
- Order total uses stored unit prices

### 10. Response Structure

**Why:** API consistency
- All responses follow same format
- Easy to parse and handle

**Decision:**
```typescript
{
  success: true | false,
  data: {...},
  // pagination for lists
  pagination: {...}
}
```

## Design Trade-offs

### 1. Monolithic vs Microservices

**Trade-off:** Monolithic for simplicity
- All in one project for easier development
- Can split into microservices later if needed

### 2. In-Memory vs Database Sessions

**Trade-off:** Database transactions for safety
- Slightly slower than optimistic locking
- Ensures data consistency across failures

### 3. Soft Delete vs Hard Delete

**Trade-off:** Hard delete for simplicity
- Products can be permanently deleted
- Could add `isDeleted` flag for audit trail

### 4. Pagination: Offset vs Cursor

**Trade-off:** Offset-based for simplicity
- Simpler to implement
- Good enough for moderate data sizes
- Could switch to cursor-based for high-volume endpoints

## Security Considerations

### Password Storage
- bcrypt with 12 salt rounds
- Prevents rainbow table attacks

### JWT Security
- Short expiration (24h)
- Secure secret required
- HTTPS in production

### Rate Limiting
- Ready for implementation (not included in basic version)
- Should be added for auth endpoints in production

## Scalability Considerations

### Current Limitation
- Single MongoDB instance
- In-memory sessions (transaction scoped)

### Future Improvements
- Read replicas for read-heavy endpoints
- Redis for caching products
- Horizontal scaling with负载均衡

## Testing Strategy

### Unit Tests
- Services tested in isolation
- Mocked repositories

### Integration Tests
- Full API testing with supertest
- Test database (mongodb-memory-server)

## Edge Cases Handled

### Authentication
- Invalid JWT tokens
- Expired tokens
- Missing authorization header

### Products
- Non-existent product retrieval
- Concurrent updates (handled by MongoDB)

### Orders
- Insufficient stock
- Non-existent products
- Idempotent payment
- Already cancelled/paid orders
- Stock restoration on cancellation

## Performance Considerations

### Database Indexes
- Users: email (unique)
- Products: name (text)
- Orders: userId, status, createdAt

### Query Optimization
- Pagination on all list endpoints
- Select only necessary fields
- Populate related entities

