--
-- PostgreSQL database dump
--

\restrict eS6cVPPKh6ccHdgBsrxeSURZlbq2UiVLbYuYNw0g1rfbPv9mGc35iV8h9hl5wpM

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CashSessionStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."CashSessionStatus" AS ENUM (
    'OPEN',
    'CLOSED'
);


ALTER TYPE public."CashSessionStatus" OWNER TO farmacia;

--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."ExpenseCategory" AS ENUM (
    'RENT',
    'UTILITIES',
    'TRANSPORT',
    'CONSUMABLES',
    'MAINTENANCE',
    'SALARIES',
    'TAXES',
    'OTHER'
);


ALTER TYPE public."ExpenseCategory" OWNER TO farmacia;

--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'CANCELLED'
);


ALTER TYPE public."ExpenseStatus" OWNER TO farmacia;

--
-- Name: LotStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."LotStatus" AS ENUM (
    'ACTIVE',
    'DEPLETED',
    'EXPIRED'
);


ALTER TYPE public."LotStatus" OWNER TO farmacia;

--
-- Name: MovementType; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."MovementType" AS ENUM (
    'PURCHASE_ENTRY',
    'SALE',
    'SALE_RETURN',
    'PURCHASE_RETURN',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'LOSS',
    'EXPIRY',
    'INVENTORY_ADJUSTMENT'
);


ALTER TYPE public."MovementType" OWNER TO farmacia;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'MPESA',
    'EMOLA',
    'TRANSFER',
    'OTHER'
);


ALTER TYPE public."PaymentMethod" OWNER TO farmacia;

--
-- Name: PharmacyStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."PharmacyStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED'
);


ALTER TYPE public."PharmacyStatus" OWNER TO farmacia;

--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public."ProductStatus" OWNER TO farmacia;

--
-- Name: ProductType; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."ProductType" AS ENUM (
    'MEDICINE',
    'PRODUCT'
);


ALTER TYPE public."ProductType" OWNER TO farmacia;

--
-- Name: PurchaseStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."PurchaseStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'CANCELLED'
);


ALTER TYPE public."PurchaseStatus" OWNER TO farmacia;

--
-- Name: RefundMethod; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."RefundMethod" AS ENUM (
    'CASH',
    'CARD',
    'MPESA',
    'EMOLA',
    'TRANSFER',
    'OTHER'
);


ALTER TYPE public."RefundMethod" OWNER TO farmacia;

--
-- Name: RefundStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."RefundStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE public."RefundStatus" OWNER TO farmacia;

--
-- Name: ReturnLineCondition; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."ReturnLineCondition" AS ENUM (
    'PENDING_INSPECTION',
    'RESELLABLE',
    'DAMAGED',
    'EXPIRED',
    'LOST'
);


ALTER TYPE public."ReturnLineCondition" OWNER TO farmacia;

--
-- Name: ReturnStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."ReturnStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'CANCELLED'
);


ALTER TYPE public."ReturnStatus" OWNER TO farmacia;

--
-- Name: SaleStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."SaleStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'CANCELLED'
);


ALTER TYPE public."SaleStatus" OWNER TO farmacia;

--
-- Name: SupplierStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."SupplierStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public."SupplierStatus" OWNER TO farmacia;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: farmacia
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


ALTER TYPE public."UserStatus" OWNER TO farmacia;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO farmacia;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    "pharmacyId" uuid,
    "userId" uuid,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO farmacia;

--
-- Name: cash_movements; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.cash_movements (
    id uuid NOT NULL,
    "cashSessionId" uuid NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    reason text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    "expenseId" uuid
);


ALTER TABLE public.cash_movements OWNER TO farmacia;

--
-- Name: cash_sessions; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.cash_sessions (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "openedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "openingBalance" numeric(12,2) NOT NULL,
    "expectedBalance" numeric(12,2),
    "countedBalance" numeric(12,2),
    difference numeric(12,2),
    status public."CashSessionStatus" DEFAULT 'OPEN'::public."CashSessionStatus" NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.cash_sessions OWNER TO farmacia;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.categories (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.categories OWNER TO farmacia;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.expenses (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    description text NOT NULL,
    category public."ExpenseCategory" DEFAULT 'OTHER'::public."ExpenseCategory" NOT NULL,
    amount numeric(12,2) NOT NULL,
    method public."PaymentMethod" NOT NULL,
    status public."ExpenseStatus" DEFAULT 'DRAFT'::public."ExpenseStatus" NOT NULL,
    "expenseDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "externalReference" text,
    notes text,
    "cashSessionId" uuid,
    "userId" uuid NOT NULL,
    "confirmedBy" uuid,
    "confirmedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.expenses OWNER TO farmacia;

--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.login_attempts (
    id uuid NOT NULL,
    "userId" uuid,
    email text NOT NULL,
    "ipAddress" text NOT NULL,
    success boolean NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.login_attempts OWNER TO farmacia;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    code text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.permissions OWNER TO farmacia;

--
-- Name: pharmacies; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.pharmacies (
    id uuid NOT NULL,
    name text NOT NULL,
    nif text,
    status public."PharmacyStatus" DEFAULT 'ACTIVE'::public."PharmacyStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    address text,
    city text,
    email text,
    "legalName" text,
    phone text,
    province text,
    "tradeName" text
);


ALTER TABLE public.pharmacies OWNER TO farmacia;

--
-- Name: products; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "categoryId" uuid,
    name text NOT NULL,
    description text,
    sku text,
    barcode text,
    "activeIngredient" text,
    "dosageForm" text,
    strength text,
    unit text DEFAULT 'UN'::text NOT NULL,
    "salePrice" numeric(10,2) NOT NULL,
    "referenceCost" numeric(10,2),
    status public."ProductStatus" DEFAULT 'ACTIVE'::public."ProductStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "hasExpiry" boolean DEFAULT true NOT NULL,
    "minStock" integer,
    type public."ProductType" DEFAULT 'PRODUCT'::public."ProductType" NOT NULL
);


ALTER TABLE public.products OWNER TO farmacia;

--
-- Name: purchase_lines; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.purchase_lines (
    id uuid NOT NULL,
    "purchaseId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    quantity integer NOT NULL,
    "unitCost" numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


ALTER TABLE public.purchase_lines OWNER TO farmacia;

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.purchases (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "supplierId" uuid NOT NULL,
    "documentNumber" text NOT NULL,
    "purchaseDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."PurchaseStatus" DEFAULT 'DRAFT'::public."PurchaseStatus" NOT NULL,
    notes text,
    "totalAmount" numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.purchases OWNER TO farmacia;

--
-- Name: quarantine_stock; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.quarantine_stock (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "saleReturnLineId" uuid NOT NULL,
    "lotNumber" text NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    "quantityReceived" integer NOT NULL,
    "quantityInspected" integer DEFAULT 0 NOT NULL,
    "quantityReleased" integer DEFAULT 0 NOT NULL,
    "quantityDamaged" integer DEFAULT 0 NOT NULL,
    "quantityLost" integer DEFAULT 0 NOT NULL,
    "unitCost" numeric(10,2) NOT NULL,
    status public."ReturnLineCondition" DEFAULT 'PENDING_INSPECTION'::public."ReturnLineCondition" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.quarantine_stock OWNER TO farmacia;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    jti text NOT NULL,
    "familyId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "replacedById" uuid,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);


ALTER TABLE public.refresh_tokens OWNER TO farmacia;

--
-- Name: return_refunds; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.return_refunds (
    id uuid NOT NULL,
    "returnLineId" uuid NOT NULL,
    "salePaymentId" uuid,
    method public."RefundMethod" NOT NULL,
    status public."RefundStatus" DEFAULT 'PENDING'::public."RefundStatus" NOT NULL,
    amount numeric(12,2) NOT NULL,
    "idempotencyKey" text,
    "cashSessionId" uuid,
    "userId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "confirmedAt" timestamp(3) without time zone,
    "confirmedBy" uuid,
    "externalReference" text,
    notes text
);


ALTER TABLE public.return_refunds OWNER TO farmacia;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.role_permissions (
    "roleId" uuid NOT NULL,
    "permissionId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO farmacia;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO farmacia;

--
-- Name: sale_line_lots; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.sale_line_lots (
    id uuid NOT NULL,
    "saleLineId" uuid NOT NULL,
    "lotId" uuid NOT NULL,
    quantity integer NOT NULL
);


ALTER TABLE public.sale_line_lots OWNER TO farmacia;

--
-- Name: sale_lines; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.sale_lines (
    id uuid NOT NULL,
    "saleId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(12,2) NOT NULL
);


ALTER TABLE public.sale_lines OWNER TO farmacia;

--
-- Name: sale_payments; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.sale_payments (
    id uuid NOT NULL,
    "saleId" uuid NOT NULL,
    "cashSessionId" uuid NOT NULL,
    method public."PaymentMethod" NOT NULL,
    amount numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    "idempotencyKey" text
);


ALTER TABLE public.sale_payments OWNER TO farmacia;

--
-- Name: sale_return_lines; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.sale_return_lines (
    id uuid NOT NULL,
    "returnId" uuid NOT NULL,
    "saleLineId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    quantity integer NOT NULL,
    "quantityInspected" integer DEFAULT 0 NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    condition public."ReturnLineCondition" DEFAULT 'PENDING_INSPECTION'::public."ReturnLineCondition" NOT NULL,
    "lotId" uuid,
    "lotNumber" text,
    "expiryDate" timestamp(3) without time zone
);


ALTER TABLE public.sale_return_lines OWNER TO farmacia;

--
-- Name: sale_returns; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.sale_returns (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "saleId" uuid NOT NULL,
    "returnNumber" text NOT NULL,
    status public."ReturnStatus" DEFAULT 'DRAFT'::public."ReturnStatus" NOT NULL,
    reason text NOT NULL,
    "totalRefund" numeric(12,2) NOT NULL,
    "userId" uuid NOT NULL,
    "confirmationKey" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sale_returns OWNER TO farmacia;

--
-- Name: sales; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.sales (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "saleNumber" text NOT NULL,
    status public."SaleStatus" DEFAULT 'DRAFT'::public."SaleStatus" NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    notes text,
    "userId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sales OWNER TO farmacia;

--
-- Name: stock_lots; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.stock_lots (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "purchaseLineId" uuid,
    "lotNumber" text NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    "quantityReceived" integer NOT NULL,
    "quantityAvailable" integer DEFAULT 0 NOT NULL,
    "unitCost" numeric(10,2) NOT NULL,
    status public."LotStatus" DEFAULT 'ACTIVE'::public."LotStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "quantityReceivedFromLine" integer DEFAULT 0 NOT NULL,
    "innerCount" integer,
    "qrCode" text,
    "totalUnits" integer DEFAULT 0 NOT NULL,
    "unitsPerInner" integer
);


ALTER TABLE public.stock_lots OWNER TO farmacia;

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.stock_movements (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "lotId" uuid,
    type public."MovementType" NOT NULL,
    quantity integer NOT NULL,
    "referenceId" text,
    "referenceType" text,
    notes text,
    "userId" uuid,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stock_movements OWNER TO farmacia;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.suppliers (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    name text NOT NULL,
    "taxId" text,
    phone text,
    email text,
    address text,
    city text,
    province text,
    notes text,
    status public."SupplierStatus" DEFAULT 'ACTIVE'::public."SupplierStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.suppliers OWNER TO farmacia;

--
-- Name: sync_operations; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.sync_operations (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    "clientId" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "operationType" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    payload jsonb NOT NULL,
    result jsonb,
    "saleId" uuid,
    "rejectionCode" text,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone
);


ALTER TABLE public.sync_operations OWNER TO farmacia;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.user_roles (
    "userId" uuid NOT NULL,
    "roleId" uuid NOT NULL
);


ALTER TABLE public.user_roles OWNER TO farmacia;

--
-- Name: users; Type: TABLE; Schema: public; Owner: farmacia
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    "pharmacyId" uuid NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "fullName" text NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO farmacia;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
20efda37-7be5-4638-85a5-a6537525b175	b62dacd62cff4939216e608c0925150a1ed51ad71d5b958cc44b92106315e665	2026-10-29 21:19:52.379397+00	20261020141435_init_corrigido	\N	\N	2026-10-29 21:19:52.092261+00	1
045519e1-2f1b-4c09-84e3-160ebfa2b442	28dc576e42cefe7e9d96535a7c56b68275a53c111119e5b456f07a8e4c37a700	2026-10-29 21:19:52.397173+00	20261020170817_add_pharmacy_config_fields	\N	\N	2026-10-29 21:19:52.384221+00	1
5581d4c5-5036-420f-a1c0-5723f882d843	73cad547fca3c9760fe2dd69dc6e2c7c14093dc98f3791b358f6a25ec5452ee6	2026-10-30 18:40:08.061958+00	20261030184007_cash_session_updated_at	\N	\N	2026-10-30 18:40:08.017223+00	1
473ec9dd-cf97-498d-be6a-5393a83686fa	13678c4597e7fdaeeeb779aa0ecf60f59880617648232b2de473101f8d8d6b12	2026-10-29 21:19:52.814274+00	20261020172710_add_categories_and_products	\N	\N	2026-10-29 21:19:52.706849+00	1
c7891598-31a4-4e0f-bd6d-90867c6deff0	8b830f8a9b23faa0f1d6b4664d002af179d5de6d101af82dd2a6579889488a95	2026-10-29 21:19:52.908251+00	20261021065004_add_suppliers_and_purchases	\N	\N	2026-10-29 21:19:52.818359+00	1
24826dc5-64f3-4e50-b867-d76e4ee58d52	284fb24908299dc07365e62e29357d326f111e996a0758c4c6de3ac31fc0e12e	2026-10-29 21:19:53.017081+00	20261021072230_add_stock_lots_and_movements	\N	\N	2026-10-29 21:19:52.912456+00	1
16e71fbf-242f-4c1a-ab1b-07c61259878a	0e88494c23859891ab7e57c37deff0ead37d6c86a63f6f2f1124cefc095b48ca	2026-10-29 21:19:53.059149+00	20261021073451_add_quantity_received_from_line	\N	\N	2026-10-29 21:19:53.020933+00	1
610672d1-f43d-46ef-94cf-f5983753c9ef	1555e557d85306629e01a27c56afb64c7fa4e3d6118ff8d150aff810fca51349	2026-10-29 21:19:53.14846+00	20261021075931_add_sales_and_pos	\N	\N	2026-10-29 21:19:53.068531+00	1
e01013ab-0e4e-484c-a619-ff078207a58c	6c9cfb7ae96b1f796fc901d7d53163b1a0539d1ec21444b21a5bd6f837a1e060	2026-10-29 21:19:53.284177+00	20261021082856_add_cash_and_payments	\N	\N	2026-10-29 21:19:53.152385+00	1
87260435-c81a-45e8-96ab-5db83fc21215	3c2e099e4a888513b5e3f4e2ef22b8b46609e8709a9e580ef97a99cbfdfae34c	2026-10-29 21:19:53.618753+00	20261021092904_add_sale_returns_and_refunds	\N	\N	2026-10-29 21:19:53.288736+00	1
9b1286eb-f981-4011-9637-02adf0a34544	cb4093e1d97aad77fe6051d7bb3ceb11d1e25d3dfb95c7d9def359ae5ea6f855	2026-10-29 21:19:53.637006+00	20261021102033_add_refund_confirmation_fields	\N	\N	2026-10-29 21:19:53.624044+00	1
0c89884a-3b2a-4ad3-bce2-fabf425ef008	eedae6f191872b14d90e6a0276f071e7159117aa8ab5f7e77d88737eebbf3653	2026-10-29 21:19:53.736353+00	20261021111512_add_expenses	\N	\N	2026-10-29 21:19:53.64094+00	1
2623867d-b5d8-4005-8b94-882a84db3a10	bad5032641b197c5d8fe5906963dded9cc215fb1bac997c569f3694160e49c34	2026-10-29 21:19:56.854823+00	20261029211956_add_sync_operations	\N	\N	2026-10-29 21:19:56.77964+00	1
8bd0b33a-6a09-4560-b9eb-3f23da48f19e	7a078a1f1faace24b28c3f8151f158e566c496afd4a1a8971c57b4da6a6bbbbf	2026-10-30 06:54:36.755909+00	20261030065436_add_box_fields	\N	\N	2026-10-30 06:54:36.726998+00	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.audit_logs (id, "pharmacyId", "userId", action, entity, "entityId", metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
3d265a32-d80e-496c-b570-d1ce0398eb4c	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-29 21:29:05.269
8b5d2a98-e6f0-492f-9337-e8c433e748bb	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.sync	Sale	fd611121-ebc2-4520-a578-412179ec1a48	\N	\N	\N	2026-10-29 21:31:24.365
de3f9c2a-3abd-46c9-a09a-92cda6f22100	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.sync	Sale	3ca11321-da07-4e7d-b771-94efb352f30a	\N	\N	\N	2026-10-29 21:32:55.398
c0e13130-9162-40e7-9cd6-fe841b6806ef	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 05:36:57.61
d31d2190-a230-4347-bacc-382971a214e5	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:44:17.154
421db323-924e-429e-91bb-a94dfaab0767	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:44:17.169
f321eeba-9a24-4db6-a245-598141dbf545	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:45:34.086
9820d667-ed15-494d-b258-7921cb34d433	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:48:37.773
e7a8dd0b-32cf-40d9-9229-30663cd51429	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:49:01.683
943e81ec-4d18-4eca-8f2f-aee1b97d3ee7	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 05:50:42.939
b5dbec76-3552-4750-bda7-11a8072175ae	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:51:45.471
ce2755a3-444e-4f68-a23b-dda1cb922fbb	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:51:45.503
514d3390-468b-4475-91bd-785caa9b18c5	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:53:07.175
b76a0dd6-3d68-40e8-9b17-6637e4b1c0b3	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:53:07.235
fb8b8ad6-33f2-4f7d-838f-24286ad5b5a3	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:53:12.092
6607f314-cded-467d-9517-8062aa9fc58d	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:53:12.256
f95654ba-aed9-4ecf-8b31-bac86789bd84	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	auth.logout	User	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	{"path": "/api/v1/auth/logout", "status": 204}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:53:26.905
b46ddbe3-4e7b-49e3-a217-3da4dc5a3718	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 05:53:51.462
584e6690-6a0b-4435-b8d9-b9c3ccc32d85	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 05:54:39.876
73a62544-a6de-45ba-90ab-57c6ed4365db	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	cash.open	CashSession	234fed98-62d1-44a3-874a-91ba88b7bece	\N	\N	\N	2026-10-30 05:59:34.313
726bff8e-6164-4394-b3da-f6a0e07618a4	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	7c01806c-1a03-4136-8435-c126bb30a9d9	\N	\N	\N	2026-10-30 05:59:34.469
7486e784-c234-4bbf-9cad-8491a9c4e03a	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 06:01:26.324
a767704e-7893-450f-8e8f-8f07cbdf5a1d	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 06:01:26.343
2e5d2e32-7a04-4450-869f-298796c29d2f	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	cab83523-d8aa-4be9-87e1-9770edb4b1a2	\N	\N	\N	2026-10-30 06:02:04.31
1a1cd277-2e81-402f-ac69-510fad3e9de3	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.confirm	Sale	cab83523-d8aa-4be9-87e1-9770edb4b1a2	\N	\N	\N	2026-10-30 06:02:04.414
40506eb1-9cfe-41cc-b0f5-8219dafba5ec	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.create	SalePayment	e08335bb-adff-4e3e-8d3f-9717ee3f1be5	\N	\N	\N	2026-10-30 06:02:04.542
909d3d86-bfe9-440a-9175-95e36a50de44	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	auth.logout	User	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	{"path": "/api/v1/auth/logout", "status": 204}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 06:02:47.607
5f631819-5080-4a2f-8082-eb6517eea4e5	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 06:03:01.246
bfcce4d9-2551-4181-a6c9-59f58f46d5d8	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.sync	Sale	5b7be39e-750f-4462-b69c-be68012fa2d0	\N	\N	\N	2026-10-30 06:04:46.619
b1b2d425-d42e-4c7d-b040-5a1643f49106	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.sync	SalePayment	2f3f4544-0e30-49b3-9b0a-f9bef3c88ec6	\N	\N	\N	2026-10-30 06:04:46.995
43255c27-1c76-415c-b2a5-65c6c5d57513	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 06:05:05.075
fe8842fd-50b6-4a36-834e-848c851189af	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 06:07:44.94
512ad7cd-bbd2-47b4-8448-f8c16429fed2	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 06:18:15.298
2f62f577-ab4a-495e-8488-9549918cb019	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 06:18:15.323
2739f791-7296-463c-b5bd-57485d7c2491	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 06:18:26.067
9541b5bc-fbf4-4f88-a0a2-a2a0d1697ee5	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 06:18:56.867
651d260e-1df9-4c0b-b464-49463248795d	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 06:22:43.41
639ee529-d05a-4f72-9b2a-a764befdf5b0	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 06:23:32.647
10e4e464-ed1b-41fe-93d2-e6162e6e16b2	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 06:25:15.233
f95cd40d-5af2-4cd2-8bce-71eb56a19f5c	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 06:27:42.999
f6fbfbad-919d-4ae9-970a-a96699d765f1	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 06:27:43.05
35489973-650c-4534-8d81-270b35c1450e	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 06:43:32.763
bf4b7487-24c5-4506-b198-aa3294f73260	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 06:43:39.522
031d6e16-074f-4b65-aee3-3b6f0e843358	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 06:49:02.061
85275371-09c1-440b-8f50-f77222cf4051	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 06:57:36.763
acd80680-d7f1-4ea2-84bb-38a5565f95a7	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 06:58:32.453
14f1d6cc-7905-48d8-85fa-de3a18f2eec8	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 07:02:01.02
4b97621c-6fa6-481f-a753-0bf303e65015	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 07:04:58.651
61e1ab28-c6fd-4060-a364-9a407290eb45	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 07:04:58.658
8457482b-6492-4b50-a2bc-27023532c648	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 07:05:10.627
3d68db78-aa06-488d-8622-1d55c6ba9153	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 07:05:37.116
cfe0a41b-faa9-4bb9-b724-72aa9c8322c4	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 07:11:40.848
f373f4c2-c5c8-4ebb-ba39-f962d393f4a4	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 07:12:28.121
4e6e355d-b146-4980-a738-463b67190e90	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 07:12:28.156
606d1e85-b198-4a03-9f89-e4c965f5a83f	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 07:15:19.542
fd7bd417-762d-4b55-9aa3-acd46d94e701	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	08ead35e-4f3e-40c9-bdda-5cb59cce84ce	\N	\N	\N	2026-10-30 07:22:34.972
a2a083a1-0a52-428f-90d4-22425b3c61cb	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.confirm	Sale	08ead35e-4f3e-40c9-bdda-5cb59cce84ce	\N	\N	\N	2026-10-30 07:22:35.074
80ed5a05-feed-415a-8453-3474b4b625fc	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.create	SalePayment	0964a386-29a2-4422-92e0-47adbd4f10e0	\N	\N	\N	2026-10-30 07:22:35.143
4c5e552d-61ea-4816-8b26-2d3d741f10b4	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	0db6bc79-9f10-40f5-bad2-b371278ef91c	\N	\N	\N	2026-10-30 07:28:23.671
17f63935-2010-4236-a948-9a468693d028	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.confirm	Sale	0db6bc79-9f10-40f5-bad2-b371278ef91c	\N	\N	\N	2026-10-30 07:28:23.796
43946960-4824-40a5-9406-99e5416680f2	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.create	SalePayment	dcb9a631-e00c-44f5-b320-ccd756f40733	\N	\N	\N	2026-10-30 07:28:23.868
9cfd44d0-9c9f-4c45-b985-3baa25c495a5	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	642a52d5-4364-4037-acc5-89253b9ee735	\N	\N	\N	2026-10-30 07:28:57.327
6286aac1-1546-4630-8c3e-d5bdac74a0d2	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	f14537c2-3fa9-4e51-8082-50737450f0ff	\N	\N	\N	2026-10-30 07:29:08.716
521eea34-c746-4f13-9f1b-fd90fb15839c	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.confirm	Sale	f14537c2-3fa9-4e51-8082-50737450f0ff	\N	\N	\N	2026-10-30 07:29:08.787
22004b4d-b2a0-465b-81a6-6796a37871d3	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.create	SalePayment	5c344af1-7013-4aa5-87d1-cf33386af4d1	\N	\N	\N	2026-10-30 07:29:08.856
d7bc85ec-cec1-4e59-9f36-eeca4f60eacc	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 07:30:28.238
9be2b29e-3b90-4385-9eca-ac8600c9cd0d	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 07:32:46.474
cafe938e-b918-488d-9634-64713add399e	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 07:41:56.841
cb2045ba-13af-4da2-90af-0a25830de72c	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 07:57:32.491
39fee483-e324-4dfd-bd8e-48d9dc94ce3b	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:00:01.273
8a3bd00c-77f6-464b-b8c1-6dca018d5105	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 12:15:33.215
2b2c7901-acb4-40b0-a71e-6acb000fd181	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 12:29:29.074
db035560-80d2-43a3-92fc-5e004bee9af7	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 12:29:29.097
bbab187a-275e-4843-80ae-83f4f48aae36	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:29:44.961
07f80766-440f-4bab-b935-fe72b1f827ae	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:29:44.984
710e1fec-6b86-4882-8902-1beb78df2612	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 12:31:45.328
1de7806b-d665-4cb2-9f41-46faee7ee10a	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 12:31:45.41
cd9dca00-c699-41b6-bb63-957501d23408	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 12:31:49.994
936cfbf3-ac59-48c5-a631-a449ba1eb05e	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36	2026-10-30 12:31:50.023
c15a8f88-62cb-4bef-bffc-bf4909ed81a0	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:34:33.06
77cc802b-fbec-4f42-8eed-fe94d4bea31f	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:44:00.663
6d7afbe5-3b35-4288-9535-5eb1cd22a225	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:44:00.675
31ae12b5-d886-4c3f-a58e-7958a53fb323	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	32fb9014-a041-436e-9f37-49906d925d2d	\N	\N	\N	2026-10-30 12:44:31.366
a672196f-4a0c-494b-9d6a-815360d9fc2e	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	bbe56041-7092-407f-a779-80d25f39570e	\N	\N	\N	2026-10-30 12:44:39.708
0ba80d84-8e5a-4fe6-a014-d01a28d7ce0b	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	1ad7958c-b3e4-4012-b934-1337a09b6adc	\N	\N	\N	2026-10-30 12:44:46.838
739fb163-20fa-4e53-80a1-d583f6a72b09	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.confirm	Sale	1ad7958c-b3e4-4012-b934-1337a09b6adc	\N	\N	\N	2026-10-30 12:44:46.881
b752613a-8e47-4566-b523-90c21be0b086	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.create	SalePayment	934b0935-5400-4ad5-99c0-84d69a24b8e9	\N	\N	\N	2026-10-30 12:44:46.935
686dd0b2-ecdd-47b4-bf2c-faffce1d043b	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:50:37.574
1d20b4b8-85d1-4ff8-9c05-13753ad91aa0	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:10.165
77825645-f639-4aba-9cb3-6157e9e44ea4	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:10.235
0c4198ff-0267-4a5d-863f-92efc01bcc71	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:25.807
3ce7562b-3d0e-4f86-8fff-7ff72fe2572e	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:25.886
4a7aa873-993b-43d5-bfca-c60047f6e250	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:38.29
cdc8ef34-a894-424f-a259-eb64b26d866e	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:38.332
9f8a273b-e375-43a6-a327-024714942efe	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:51.839
5f4abd6b-85ca-4bb0-b242-70a24d379cd9	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:51:51.925
210a19be-5b0b-4d98-9cb7-8531738a0859	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:52:03.453
133c553b-21bd-4b9f-942d-c158374fb613	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:52:03.5
2009c0eb-3638-4bfc-b357-cd020c20b3d5	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	85f767a3-ddd8-4696-b487-a758f3832814	\N	\N	\N	2026-10-30 12:52:20.869
4481adc4-867d-4129-9087-a71e9978525b	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.create	Sale	e55d8231-34a4-405e-992e-eacd97bf786e	\N	\N	\N	2026-10-30 12:57:47.509
0f2ad591-f320-4b82-983d-1053341636ce	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.confirm	Sale	e55d8231-34a4-405e-992e-eacd97bf786e	\N	\N	\N	2026-10-30 12:57:47.598
e98627a3-9fff-4b3a-9c5f-2db803771d0d	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.create	SalePayment	b66d61c4-8953-435d-a96e-0103a2957f37	\N	\N	\N	2026-10-30 12:57:47.65
ca42f4d1-c3d2-463a-9ee6-6ab6196b63ac	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:59:36.354
3d4541e2-ac1f-4c9e-873e-3d1e43c80ed2	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 12:59:51.812
8c251168-d747-451f-8797-5ef347282159	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 13:01:42.589
eb8fc07f-3f8a-408e-94ed-8d1773516610	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 13:01:42.669
8d57e2e7-2074-4840-96ca-ea9e3ced08ac	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 13:17:32.473
55d6bf9d-fb99-4928-88e7-f1f5684aea0a	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 13:32:32.399
8c49834c-a324-44bb-b7b2-fe92a8305736	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 13:47:32.432
db21b4a6-3c61-4504-b290-ba39da572bce	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 14:02:32.395
80ede4a0-6656-4a01-bc31-25423916a104	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 14:17:32.43
c7c35a3f-ac02-44c1-a54f-56abdcd42bba	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 14:32:32.363
5d1240a6-570b-4e83-9e8d-369ea086a8bb	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 14:47:32.403
b658ed25-8d96-4ced-93ff-c5c797251ac3	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 15:02:32.376
d10539d6-f692-4f56-bcc1-5ee422fd6e69	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 15:06:42.254
fe5e545e-bc57-466a-a2f1-537411f3fc2f	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 15:33:20.46
3fd7cf7a-0ea0-4d75-8828-5e5d1a864573	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 15:33:20.49
99ce62e0-dd01-4921-b262-8b90d6a8e4f5	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 15:33:33.525
9f4916f4-30ed-42c8-a8c9-2f87472cdd79	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.sync	Sale	17223a3f-784a-41ab-b094-b566c413bbee	\N	\N	\N	2026-10-30 15:33:35.592
d4b2c0ac-22d5-4e27-b642-d3a84b9bd3b1	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.sync	SalePayment	7572e8ff-940b-4a55-bf5c-7f2cd9f83c8e	\N	\N	\N	2026-10-30 15:33:35.658
2cd059eb-d988-4f59-998b-28c151279059	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 18:46:32.814
4258e85a-49dd-4687-b826-6d172e283e96	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.sync	Sale	2731af07-d7fc-4c07-86d8-0140af35ffec	\N	\N	\N	2026-10-30 18:46:33.031
88c49592-ef55-4f6a-a7b9-f85f06638960	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	sale.sync	Sale	91a92943-f9b4-46cf-990d-d6722f16ccfb	\N	\N	\N	2026-10-30 18:46:33.077
164176e0-5ca0-48ad-bb71-f91aa13cfa37	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.sync	SalePayment	a2e387b7-3d24-483c-8230-0de1d1e69d48	\N	\N	\N	2026-10-30 18:46:33.121
0bcf01e6-7b97-4244-b9a3-ff74853b868f	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	payment.sync	SalePayment	15c895c3-a936-4bc4-a977-2d812d820c36	\N	\N	\N	2026-10-30 18:46:33.148
04d6106f-783b-41a0-a272-fd120c02e270	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 18:57:11.229
07b67b7e-b772-4727-beaf-9ffd01ae41ed	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:01:33.209
fb8e3992-156b-4a89-b151-a719a02bd543	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:01:33.489
12a42192-25c3-4eb1-bda7-450810577199	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:17:21.384
21f95ab1-f0b9-4bf6-ba91-fd3b84ab323c	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:29:29.838
8d1bec96-472d-4598-9565-c4c3990e3742	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 19:29:57.746
6a9ad8cf-c057-423c-af66-f5a9baa5a8c5	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:40:27.758
5d483f41-430e-4903-862e-7f1860f965a1	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:40:27.774
7e9f3b2f-9c61-4789-89bc-cdbb13c6d599	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:46:10.988
f2f08d2f-db1c-4fcb-b734-8da193bef2a2	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:46:11.002
ffece517-b620-42fe-8e2c-a36ac4fabf54	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:46:12.698
e6f56689-7182-4ac5-98fa-6413e56185ae	\N	\N	auth.refresh	User	\N	{"path": "/api/v1/auth/refresh", "status": 200}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2026-10-30 19:46:12.861
381689d4-e30e-4f34-ae89-e023133d14ec	\N	\N	auth.login	User	\N	{"path": "/api/v1/auth/login", "status": 200}	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456	2026-10-30 21:32:45.608
\.


--
-- Data for Name: cash_movements; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.cash_movements (id, "cashSessionId", type, amount, reason, "createdAt", "userId", "expenseId") FROM stdin;
\.


--
-- Data for Name: cash_sessions; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.cash_sessions (id, "pharmacyId", "userId", "openedAt", "closedAt", "openingBalance", "expectedBalance", "countedBalance", difference, status, "updatedAt") FROM stdin;
234fed98-62d1-44a3-874a-91ba88b7bece	ca23c44a-9483-44c3-bc54-f4d994150255	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 05:59:34.269	\N	0.00	\N	\N	\N	OPEN	2026-10-30 18:40:08.034
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.categories (id, "pharmacyId", name, description, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.expenses (id, "pharmacyId", description, category, amount, method, status, "expenseDate", "externalReference", notes, "cashSessionId", "userId", "confirmedBy", "confirmedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.login_attempts (id, "userId", email, "ipAddress", success, "createdAt") FROM stdin;
8efc0e44-1d62-49d1-96c4-f6d991d79c95	\N	teste@local.test	::1	t	2026-10-29 21:29:05.213
85301086-769a-4da5-83ad-4b9729173c0c	\N	teste@local.test	::1	t	2026-10-30 05:36:57.551
22845ec8-d163-4dba-9f72-d43801d6936a	\N	teste@local.test	::1	f	2026-10-30 05:45:10.858
db54c93f-2203-4b97-ac95-4124bfdbaa1a	\N	teste@local.test	::1	t	2026-10-30 05:45:34.068
16dcb491-485c-4a41-a55d-086780dbc1ed	\N	teste@local.test	::1	t	2026-10-30 05:49:01.666
6c3dfc46-9dd5-45e3-8313-387f3f1120c3	\N	teste@local.test	::1	t	2026-10-30 05:50:42.9
a755e3f7-958d-4b3a-b93c-e064c9ee2aec	\N	teste@local.test	::1	t	2026-10-30 05:53:51.44
4eb205d4-8dc0-46f7-94e8-92be97770854	\N	teste@local.test	::1	t	2026-10-30 05:54:39.856
5192587a-85f0-4c7b-b511-4741ed23b085	\N	teste@local.test	::1	t	2026-10-30 06:03:01.228
65961c68-f7d3-4bad-966c-05f026d478fa	\N	teste@local.test	::1	t	2026-10-30 06:05:05.036
6f5faec2-0c5c-418d-9c8e-c285adffe39b	\N	teste@local.test	::1	t	2026-10-30 06:18:56.849
c91c02b4-99bb-42c5-be8b-467c613ba99c	\N	teste@local.test	::1	t	2026-10-30 06:22:43.374
de18efad-6acd-4b29-af93-1b4ba78318a4	\N	teste@local.test	::1	t	2026-10-30 06:43:39.498
9d2f541a-3ebb-4707-8af6-121d16b5ea80	\N	teste@local.test	::1	t	2026-10-30 06:49:01.995
f017fddb-a7e0-43e9-b335-590891fae211	\N	teste@local.test	::1	t	2026-10-30 06:57:36.732
ffb91601-8cdc-4d9a-bcc6-9d70bc1f23d3	\N	teste@local.test	::1	t	2026-10-30 07:02:00.98
25992f1b-ed59-4a16-a9e9-f73641cfbd64	\N	teste@local.test	::1	t	2026-10-30 07:05:10.573
58532092-c0e3-4ede-b318-69d0c4791d7b	\N	teste@local.test	::1	t	2026-10-30 07:05:37.103
9b75e4d0-8511-4514-bdd8-dc7d00034474	\N	teste@local.test	::1	t	2026-10-30 07:11:40.804
fcc97c64-0607-4741-bb75-42fb1b36cea7	\N	teste@local.test	::1	t	2026-10-30 12:00:01.23
49907407-0108-470f-8697-b39e0ee12e86	\N	teste@local.test	::1	t	2026-10-30 12:50:37.543
86fa8810-e667-4b27-b5a4-8983f2c04394	\N	teste@local.test	::1	t	2026-10-30 15:06:42.22
c8c2225c-eaf5-4bdf-baf6-1ddff3a9eb6f	\N	teste@local.test	::1	t	2026-10-30 18:57:11.185
84c3231e-5c76-4f46-a479-d22936c86b4b	\N	teste@local.test	::1	t	2026-10-30 19:17:21.335
73e1541f-2d5b-4878-8e7c-69734dcc1dc8	\N	teste@local.test	::1	t	2026-10-30 19:29:57.729
2449af06-d196-4edb-8cb2-127d316b0f32	\N	teste@local.test	::1	t	2026-10-30 21:32:45.565
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.permissions (id, code, description, "createdAt") FROM stdin;
7e26b78d-0af6-457d-910f-03612d0a8232	users:read	users:read	2026-10-29 21:23:22.831
c563db87-73b4-4941-b881-9937fa3c08ef	users:write	users:write	2026-10-29 21:23:22.903
de706a0a-c8aa-4aac-8775-7df31d0a8726	roles:read	roles:read	2026-10-29 21:23:22.913
66c1d9f9-f6bd-4a73-ba3d-59e3d18d1abe	roles:write	roles:write	2026-10-29 21:23:22.922
4e8fcd8e-1a3d-4941-85d5-fc07d41d692c	pharmacy:config:read	pharmacy:config:read	2026-10-29 21:23:22.93
d8d5d613-9612-47d2-ac12-79981a850fc3	pharmacy:config:write	pharmacy:config:write	2026-10-29 21:23:22.939
38e07301-552c-4195-82d4-5b56f7e9e935	audit:read	audit:read	2026-10-29 21:23:22.947
307b9a70-d72f-4a1b-8896-ec36f6c0cf73	products:read	products:read	2026-10-29 21:23:22.956
f5faf2ec-8114-4f7f-9073-300caf343b7d	products:write	products:write	2026-10-29 21:23:22.965
54ea5545-ebec-4c19-808d-00e49fd0b524	suppliers:read	suppliers:read	2026-10-29 21:23:22.973
584895f5-96e4-453a-bbbf-9e1080ab2108	suppliers:write	suppliers:write	2026-10-29 21:23:22.981
f56a540f-5450-4d2b-8441-fb41769971a5	purchases:read	purchases:read	2026-10-29 21:23:22.99
cd54b6d7-4b5d-4ef3-b977-10cd0eecc68c	purchases:write	purchases:write	2026-10-29 21:23:22.997
eac5d78f-1402-4bbb-a479-eae8216ac6b4	stock:read	stock:read	2026-10-29 21:23:23.006
cb408cf3-f817-44bc-98fb-0fc781fa46c7	stock:write	stock:write	2026-10-29 21:23:23.014
3387f115-b600-442f-8a2c-369a7829512f	stock:adjust	stock:adjust	2026-10-29 21:23:23.022
0f70a62a-90f1-4ee5-b922-c17d4f545519	sales:create	sales:create	2026-10-29 21:23:23.03
4318285a-fa30-4a1e-ae6d-d2f9b5495b68	sales:read	sales:read	2026-10-29 21:23:23.037
99f531fc-16dc-4674-979c-bda55257b622	sales:void	sales:void	2026-10-29 21:23:23.045
b888dca9-efc8-4f75-89f0-a31f1cd3ac7b	cash:open	cash:open	2026-10-29 21:23:23.053
ab46439a-7b32-49bf-b8f9-ddada1bfc6b2	cash:close	cash:close	2026-10-29 21:23:23.061
0b7779ab-b0b6-4732-9217-02823e2271d7	returns:read	returns:read	2026-10-29 21:23:23.069
b88f209a-9edc-4f2f-88af-bb1c2a5c5ea5	returns:create	returns:create	2026-10-29 21:23:23.084
63abf3dc-25ec-4009-ad00-614b2e76788d	returns:confirm	returns:confirm	2026-10-29 21:23:23.092
d8872829-2edf-4d11-84fa-bd1fb34f53f8	returns:inspect	returns:inspect	2026-10-29 21:23:23.102
ba3fae14-1b73-49cb-b9a0-dc74f81ba02e	returns:release	returns:release	2026-10-29 21:23:23.109
eccf5582-1c28-454d-a1ee-cba133741bd2	returns:refund	returns:refund	2026-10-29 21:23:23.117
950ffa89-31c3-4ca6-87cf-3f3d44c20d08	expenses:read	expenses:read	2026-10-29 21:23:23.126
ab583acb-b471-4d87-a8e9-1154ca14a1d7	expenses:create	expenses:create	2026-10-29 21:23:23.134
5edfbc6a-03b2-4a59-91ae-e8e9030e8ea5	expenses:confirm	expenses:confirm	2026-10-29 21:23:23.142
87fd2ec4-781a-4bf3-bfec-ed7d5f9c4a29	expenses:cancel	expenses:cancel	2026-10-29 21:23:23.15
e09e76ac-24a5-4c5e-b976-ba7db1c0d319	reports:read	reports:read	2026-10-29 21:23:23.159
96d7dada-bed5-48f9-b16f-7c5100a73946	reports:financial	reports:financial	2026-10-29 21:23:23.167
\.


--
-- Data for Name: pharmacies; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.pharmacies (id, name, nif, status, "createdAt", "updatedAt", address, city, email, "legalName", phone, province, "tradeName") FROM stdin;
ca23c44a-9483-44c3-bc54-f4d994150255	Farmacia Teste	\N	ACTIVE	2026-10-29 21:24:53.192	2026-10-29 21:24:53.192	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.products (id, "pharmacyId", "categoryId", name, description, sku, barcode, "activeIngredient", "dosageForm", strength, unit, "salePrice", "referenceCost", status, "createdAt", "updatedAt", "hasExpiry", "minStock", type) FROM stdin;
aa99628b-1ac8-4e36-9700-9c9abb66dc98	ca23c44a-9483-44c3-bc54-f4d994150255	\N	Colgate Teste	\N	\N	\N	\N	\N	\N	UN	55.00	\N	ACTIVE	2026-10-29 21:30:31.14	2026-10-29 21:30:31.14	t	\N	PRODUCT
\.


--
-- Data for Name: purchase_lines; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.purchase_lines (id, "purchaseId", "productId", quantity, "unitCost", discount, subtotal) FROM stdin;
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.purchases (id, "pharmacyId", "supplierId", "documentNumber", "purchaseDate", status, notes, "totalAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: quarantine_stock; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.quarantine_stock (id, "pharmacyId", "productId", "saleReturnLineId", "lotNumber", "expiryDate", "quantityReceived", "quantityInspected", "quantityReleased", "quantityDamaged", "quantityLost", "unitCost", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.refresh_tokens (id, jti, "familyId", "userId", "tokenHash", "expiresAt", "revokedAt", "replacedById", "createdAt", "ipAddress", "userAgent") FROM stdin;
1124f8d6-4d85-42dc-9a70-e95549862bb2	9b168d78-4562-4440-9620-70487305c802	36a2201d-c97e-4670-bdfa-efb0997cad33	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	f8c07008f124fb2da78ce13e1485e14565d8cf714abd8d2f6d08d501c7f86b70	2026-11-05 21:29:05.238	\N	\N	2026-10-29 21:29:05.241	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
0717ce6d-9611-45b3-b7fe-17bb2acaefe7	52d4bb2c-4553-472b-98fe-08a5253747ec	e434cfb4-c8a4-4ab6-9c63-944e77321637	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	88cf41d65cd2486dc46c477b74b5bd089b7355aa628f20442d027efbf8ca9955	2026-11-06 05:44:17.111	\N	\N	2026-10-30 05:44:17.112	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
89776efc-ec1c-45e7-9ee6-de8bf5aa5f14	57c592e0-2ecf-4175-b7bb-07bd41324219	e434cfb4-c8a4-4ab6-9c63-944e77321637	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	669ec6f3f4d1208b27f138d5b5e64315d81cb8f4e11310a7e35be8e98f60bcb2	2026-11-06 05:44:17.109	\N	\N	2026-10-30 05:44:17.111	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
dec6ada5-d97b-498d-9927-0ab738169f8f	90e89b4a-2ad9-4c3f-8fbf-6b91c9cb1170	5bb29cbc-cc98-4f25-820b-bd48a496f736	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	0a0874c9c9fff74802a19627b924c2f815a9c2c40907a2a75423b36856c2f0b3	2026-11-06 05:53:07.136	2026-10-30 05:53:12.074	13c1f8f8-8b18-4841-bb9c-145b8c6fa8cb	2026-10-30 05:53:07.138	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
95d62dd7-8859-41fe-af3b-984750250f18	f368d21b-b227-4585-aa6b-bd3949485e09	e434cfb4-c8a4-4ab6-9c63-944e77321637	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e8c201790fd568a553666e2768fde5a463f987ea12db73b3fe1f0097308ef8bb	2026-11-06 05:36:57.591	2026-10-30 05:44:17.128	0717ce6d-9611-45b3-b7fe-17bb2acaefe7	2026-10-30 05:36:57.592	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
6408fc44-03ce-41f8-a5c3-88642cce0c5f	a59e28a3-3312-433a-b08a-4f6268aa9826	1fa55775-7a5e-4634-aa6f-e04e539f1a04	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	d91f88c26cadb0fd62ecac3b0cda993584bb0c6ffe4105ae28159ce556962a40	2026-11-06 05:45:34.076	2026-10-30 05:48:37.708	c05523e8-9255-478f-997b-c00a5122d8ef	2026-10-30 05:45:34.078	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
c05523e8-9255-478f-997b-c00a5122d8ef	a1446d3a-3a18-44b7-b923-33da802b41f4	1fa55775-7a5e-4634-aa6f-e04e539f1a04	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e136ffb73d0e9434fb2b35cfa1594d3a7dc0bc6da08ea42f6b871f131c157f61	2026-11-06 05:48:37.674	2026-10-30 05:48:38.193	\N	2026-10-30 05:48:37.68	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
608b3c9c-ee58-4cda-9412-d03386da6281	c80848b3-e4e5-4bf9-a7d1-ed59eeabcea3	0f5e0cb0-0b72-4d54-8563-dd1224fa515f	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	ad22d0b5df8af132ad129f82a767f772fee771e41d7d7a35fc2e1fcd6fa67f14	2026-11-06 05:50:42.924	\N	\N	2026-10-30 05:50:42.925	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
9eb945e4-d002-4c37-927c-3031f056635c	3587dc71-a3b5-4fcd-8aed-ea381d0043c8	5bb29cbc-cc98-4f25-820b-bd48a496f736	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	ac0c19a603de65f8b19cc013d077553886fe71722cd7d4a2fb23e24305034862	2026-11-06 05:51:45.452	2026-10-30 05:53:26.888	\N	2026-10-30 05:51:45.453	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
255b64dd-27fe-4be4-8f40-c6d9149ecc81	121581ff-5e11-4302-9add-16753b366b78	5bb29cbc-cc98-4f25-820b-bd48a496f736	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	7cf36032550685d89c2da5cded37c68f7e3391f0e72db74a12fd231f9308caf5	2026-11-06 05:49:01.674	2026-10-30 05:51:45.471	a53b6bf7-c81a-4aa9-b650-71e3679e4bac	2026-10-30 05:49:01.675	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
537ab427-3822-4c66-8da7-84da48662c79	935ee504-20e1-4b1e-8452-4e2eaf157472	5bb29cbc-cc98-4f25-820b-bd48a496f736	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	12cb92fc53de3eea7677cdcee338d073d192fa88c9d058b539b04953884adc4f	2026-11-06 05:53:07.062	2026-10-30 05:53:26.888	\N	2026-10-30 05:53:07.065	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
a53b6bf7-c81a-4aa9-b650-71e3679e4bac	5b8b08c6-57ac-40a1-bc9e-475c6e36a0ab	5bb29cbc-cc98-4f25-820b-bd48a496f736	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e5c68e09467349674133d76a9e39de7c43295c09c3b488371f72818d11b0a0e9	2026-11-06 05:51:45.433	2026-10-30 05:53:07.144	dec6ada5-d97b-498d-9927-0ab738169f8f	2026-10-30 05:51:45.435	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
76b53551-dee1-4158-9cf8-260a7a3ba895	6693d7a1-0104-410a-b68e-c7856b2a21bf	5bb29cbc-cc98-4f25-820b-bd48a496f736	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	7bece57d6518fc1250cc38b3014c92338bad9690df7d349d5ac26e378e3bcd8f	2026-11-06 05:53:11.979	2026-10-30 05:53:26.888	\N	2026-10-30 05:53:11.982	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
13c1f8f8-8b18-4841-bb9c-145b8c6fa8cb	bf3d0e7b-ed26-41ec-a45c-16321c17e519	5bb29cbc-cc98-4f25-820b-bd48a496f736	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2431f96418c3c001ddda28eb95956fa518a6f37bb35de2bf5250813610dcb37f	2026-11-06 05:53:12.043	2026-10-30 05:53:26.888	\N	2026-10-30 05:53:12.045	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
e80719d8-d4ef-41a1-ab84-17be2b21fa0e	21725cec-8188-499d-bcef-ecaa9635d543	1ad3507f-eb59-4ad1-a8b4-f0c993595cc0	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	3377716d570a31ee046e04c3fc4a2c3f909cdae1a191fae88ed773f87d05f07a	2026-11-06 05:54:39.867	\N	\N	2026-10-30 05:54:39.868	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
ffebdbcc-9ccc-4329-b47a-1c80198f8403	8d83f72f-53f2-4416-90b7-acc687e1d4f8	2fd12600-f906-403d-833c-9c779058eb8f	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	24f472dfea00eb88cf1cefbaa9f135d32314ad4adcbccfabdd0e51ed3c436972	2026-11-06 05:53:51.447	2026-10-30 06:01:26.305	2ae13299-fb73-44f7-9ba0-75324b415eeb	2026-10-30 05:53:51.449	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
2ae13299-fb73-44f7-9ba0-75324b415eeb	f28a19fc-32f6-4c02-962f-fca38e2b842c	2fd12600-f906-403d-833c-9c779058eb8f	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	ce70493751523b5498c8986ff7370180dd226b478e52890b7b67e3b17e62fae0	2026-11-06 06:01:26.285	2026-10-30 06:02:47.594	\N	2026-10-30 06:01:26.289	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
7ced295a-0af3-42e0-9a55-3ced0fda1023	65007de3-d5d1-45a4-ad21-f3f7654e2b5e	2fd12600-f906-403d-833c-9c779058eb8f	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	45ca54e6c08a2da14dea0c9b18cc566fedabfa8f8ca1e2cf51be798e53141247	2026-11-06 06:01:26.287	2026-10-30 06:02:47.594	\N	2026-10-30 06:01:26.289	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
384e9d0a-bfe9-4109-acee-f9987a8e842b	3366b8fa-0ae5-484b-9982-0c4518370359	ecbdea52-cafb-4da2-9c7c-0c6ffd88a606	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	71d30c89a3a804be1db37bebba7a9e94539066a2ee1b9f1742a30908446559e6	2026-11-06 06:05:05.057	\N	\N	2026-10-30 06:05:05.059	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
07b003e5-3ddc-4e71-85d1-c21c5daa64a8	9a0261f0-c3a2-49ea-80cc-e141821153a1	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	0c05a470baa4abae9e22455fa6ed6ff8d2274383483f616bf925722e87c2d698	2026-11-06 06:03:01.237	2026-10-30 06:07:44.621	c12d4449-c080-4484-8214-86585b2fa0be	2026-10-30 06:03:01.238	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
dd516c1e-e60d-4232-b894-fb6b2d67b86b	7d86d0ce-e184-4ded-bea0-58adde55f3f5	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	67180d33d56deb73dd7dc70e109b9009996ed67e235a99f7dbbdcae95266f997	2026-11-06 06:18:15.252	2026-10-30 06:18:26.045	54be11dc-314c-44c3-aeeb-bbcd6148c67f	2026-10-30 06:18:15.255	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
54be11dc-314c-44c3-aeeb-bbcd6148c67f	23105bb1-ea62-4c36-9375-b8b01369f886	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	76b633043157d015111dbabfc05abac02052ec1dad71932d4d9c515537bae776	2026-11-06 06:18:26.042	2026-10-30 06:23:32.63	cc63b36c-ec2d-415f-be7d-b3ddd8c2c09f	2026-10-30 06:18:26.045	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
d6e47c13-9fab-4cb8-8f0e-491c5f8701e8	4ce6781b-efea-4103-a2ec-2f8a0addcd1f	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	7a3691d0cb5282737726d79ef4db64a7044a128fd495f1060b1e80b09e1dfc94	2026-11-06 06:18:15.25	2026-10-30 12:34:33.215	\N	2026-10-30 06:18:15.254	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
c12d4449-c080-4484-8214-86585b2fa0be	d490fa09-60d2-4f52-aa44-ffb4b426f109	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	43787e9f09a2d53e6e485746743d67ec49ee7491fbaf939a56009a8897353d33	2026-11-06 06:07:44.601	2026-10-30 06:18:15.276	dd516c1e-e60d-4232-b894-fb6b2d67b86b	2026-10-30 06:07:44.604	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
61fe442f-63b6-435a-adba-c8d8093fd157	4bdd6442-2687-4480-89af-f89f973345be	f214cc11-a5d1-4464-b095-779f53d9f1ed	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	07061432057d70a196f072551c703a078a991c5a5f3850dd7ced650a2ae90935	2026-11-06 06:18:56.857	\N	\N	2026-10-30 06:18:56.859	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
82ee08ba-b478-460e-9e43-08324b735744	b5b73d0d-2e0c-49b3-aed9-d09ae693128f	fef464da-f3b8-446f-90c3-d53d0e8624c1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	5f6525a8f4aee6e2d46850caca0b517e6952ec302746135fbaa4839969c4a8f4	2026-11-06 06:22:43.394	\N	\N	2026-10-30 06:22:43.395	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
cc63b36c-ec2d-415f-be7d-b3ddd8c2c09f	13510a16-8e00-4a9a-a84c-dabee150e34b	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	af3a88b6edf731b0cb01d171ba7301f2c7393d8b278656835d21492de718d957	2026-11-06 06:23:32.616	2026-10-30 06:25:15.22	0c5996ca-b09f-4b92-a608-94023d27a10e	2026-10-30 06:23:32.621	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
0c5996ca-b09f-4b92-a608-94023d27a10e	13ce24bb-b525-488a-a036-42b6f6cebf36	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	fbb1746dc7b0aa8faac9f79c625643da926260cca6a9018f99422e53bc951440	2026-11-06 06:25:15.215	2026-10-30 06:27:43.023	5cc8d674-90a2-4ed6-aad4-9e579716226a	2026-10-30 06:25:15.216	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
5cc8d674-90a2-4ed6-aad4-9e579716226a	e483763d-9ec8-4aac-bbc2-c58023a3ed96	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	3653e70ee95d4af0a5d239a34dd2b7fb850e3fea8d85e1fae33b3592473d7337	2026-11-06 06:27:43.012	2026-10-30 06:43:32.727	954c2b6e-11d1-4f5b-a990-df38fb737b06	2026-10-30 06:27:43.023	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
81716b80-74bc-4229-a9a7-5c8970fc3a07	b24799e8-e792-4b2f-aae8-1d4bed783faf	00ed2327-a0e3-4023-bc2f-32a5d06fc9c5	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	fff1cf83b87d8d1c24aa0676e472d0e69651f25d770e57ba0d0ae24d5e16c7b9	2026-11-06 06:43:39.494	\N	\N	2026-10-30 06:43:39.509	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
887df018-ce88-43f6-964c-27580775ceab	7eae518e-341c-4fa3-9eb4-3917d42e4576	3cfbf624-8fc8-426e-9f88-467b6597883d	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	47f7d6de715fc8152141c10bb77c04132a290c7759feed78ce9b9b87d35fd697	2026-11-06 06:49:02.031	\N	\N	2026-10-30 06:49:02.034	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
b2c872c4-8cb3-451c-96b6-2f74caa65077	76fbb0b3-334d-4de2-a108-02f17cc7c495	976765fb-92cd-445e-afeb-e659b34fb198	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	51987c18c66a541f8371d30e2450263f15c0f3c00ce1129a6c2c3efac9cc8edb	2026-11-06 06:57:36.745	\N	\N	2026-10-30 06:57:36.746	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
954c2b6e-11d1-4f5b-a990-df38fb737b06	548a65c5-e1ce-48ea-9c86-5b536a72db35	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	a0ac4d036260d9f1ab1331967e2c280dbf1df87ce802860dd3da6bbf1f67cc5e	2026-11-06 06:43:32.705	2026-10-30 06:58:32.43	1dd16766-5d22-447e-b2f5-e8242d66930a	2026-10-30 06:43:32.72	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
21f83b56-9694-4544-ab9d-666954daa3b0	ff65e2b6-d7b5-4cc1-b65a-2a169c2811c7	4d3e9d55-04a9-437a-89f8-6118c74304b0	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	8a623705edb4f2503a30d1fbeaae37aba58bd044fdd89061d1a6116044148eb1	2026-11-06 07:02:00.999	\N	\N	2026-10-30 07:02:01.002	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
1dd16766-5d22-447e-b2f5-e8242d66930a	6cc71651-4bdf-4992-bbad-b68934e03b45	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	6a98b02dc2ba7924cafc5dbc551ca89ae18f5a50976a9d4c0a1fa5ac1c06bc5e	2026-11-06 06:58:32.424	2026-10-30 07:04:58.629	b6a38858-ea3e-40ed-9807-32ebe5aa461d	2026-10-30 06:58:32.426	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
0cd24e04-bbad-47d5-a6e0-04eed42bf8b4	6147b1de-4358-4210-b744-e663990e9af9	5834ed54-8d89-49c0-b03b-b4cffeb70f13	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	72168228f751919bf1e9f97a6663b6fa4d6f7bd098de4e28bcd9f4307b91fb21	2026-11-06 07:05:10.593	\N	\N	2026-10-30 07:05:10.594	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
1b3edac7-809f-476f-b10c-dcc866b6d041	cac7573d-b28a-489e-aa3c-0bcc24aed72a	01d8410f-d390-4f61-bc28-63def6994132	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	927a8f6d288cab221bf3644b09c92f4eb4da652a488467e06630e79ca7702257	2026-11-06 07:05:37.109	\N	\N	2026-10-30 07:05:37.111	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
4a11b57c-3658-4193-9e51-dff05f598192	b7212e34-6da0-42bf-8f1e-882714bb3dc8	708e60f5-e8ce-4155-8697-df3993d699cd	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	bea37e29106b3a9fad3b54a9b7efb4c7b88ccb89a26e2c87679507f3c762568c	2026-11-06 07:11:40.828	\N	\N	2026-10-30 07:11:40.83	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
b6a38858-ea3e-40ed-9807-32ebe5aa461d	61f46a37-9c01-4a7f-843e-badcec30f99b	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	edf6e17859ef0243e7309db86527fc2b7fafa6cf38d30673ab8d92d7dc8e26d9	2026-11-06 07:04:58.622	2026-10-30 07:12:28.112	8242e8f4-3dc6-43ff-bcdc-a0ad85e07241	2026-10-30 07:04:58.625	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
8242e8f4-3dc6-43ff-bcdc-a0ad85e07241	7bdd7106-99a4-4573-aaeb-9b5fe1582480	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2eb9ea926ba820a95deb3d7f97a0da32b57bfb784d51559447853b930dd4a18b	2026-11-06 07:12:28.104	2026-10-30 07:15:19.492	590becba-a024-4dda-9ef2-b15aa78d12af	2026-10-30 07:12:28.106	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
590becba-a024-4dda-9ef2-b15aa78d12af	7762c2c5-ffd0-4dc6-9c8e-38dd58904420	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	494c9af96b07e2de78f4b3e959c8cb02379e4c846dc9773fce99e395a1bf0bed	2026-11-06 07:15:19.387	2026-10-30 07:30:28.121	fdbc0622-059f-4bc5-b656-c868b99509a5	2026-10-30 07:15:19.39	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
fdbc0622-059f-4bc5-b656-c868b99509a5	fb7a1da9-aaa7-48d1-b0d7-3727429fd044	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	4bab39d6654de6dfe7365d25cba1e91daacd8e70a90845b71aeaa0d80cfed526	2026-11-06 07:30:28.114	2026-10-30 07:32:46.378	767f7262-4a3d-4b20-82c2-e7a7901093c3	2026-10-30 07:30:28.117	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
767f7262-4a3d-4b20-82c2-e7a7901093c3	a1edfcce-3055-4a1a-9db6-d96969a4c3df	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	27248764f6c9f21a02c7ad282a659a30f17622bba3390991a4879c4a339d4ec2	2026-11-06 07:32:46.364	2026-10-30 07:41:56.815	5e31a8d3-79cb-4d2c-b07e-e1af0adca5a8	2026-10-30 07:32:46.367	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
dc969dd3-032e-4923-a0c7-e0716be9605b	67390b6d-7788-4433-80a6-acd86255b272	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	89c687d28fcfc062bc63056be86cf6799354da1d2c11fe89d18fadd4d23bb256	2026-11-06 07:57:32.419	2026-10-30 12:34:33.009	eadf077d-08c9-4259-bac3-ba9f62b21110	2026-10-30 07:57:32.432	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
3c487683-d1ef-4b73-bf19-5c98feea5bb8	2609dd38-2149-4d92-b008-a49631dc2fcd	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e82e7ed572e076da8495ba4dcab7f7e343561989d9abe9d9aa8f6e29debbb1f2	2026-11-06 06:27:42.951	2026-10-30 12:34:33.215	\N	2026-10-30 06:27:42.962	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
5e31a8d3-79cb-4d2c-b07e-e1af0adca5a8	591569c3-030d-4958-a064-38f0b2b734e8	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	1d86b42b7b6b8fb607ee8aef8feabe521035496c0d13a3100fca17bb46cf2855	2026-11-06 07:41:56.761	2026-10-30 07:57:32.443	dc969dd3-032e-4923-a0c7-e0716be9605b	2026-10-30 07:41:56.766	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
0de59402-e4f1-4273-9e07-7e5e51c86916	72d5d77a-d900-4966-95f6-6486f400d1dd	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	a2451358eb79fa111c43489baaf5863281d2278b3f34e05449af7279bff15f05	2026-11-06 12:00:01.253	2026-10-30 12:15:33.179	3fabb15d-4c7c-4b21-a9b2-8f0c40bbb59b	2026-10-30 12:00:01.255	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
eadf077d-08c9-4259-bac3-ba9f62b21110	bc49995a-13a3-4178-b1ea-36cd9aab173d	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	24b35d507a366fd3660a62ac8ac538315ca9816699771c058845beae985e3648	2026-11-06 12:34:33.004	2026-10-30 12:34:33.215	\N	2026-10-30 12:34:33.012	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
3fabb15d-4c7c-4b21-a9b2-8f0c40bbb59b	640531be-8ae7-4668-8085-37fb5abf4a62	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2a0ed44f8a400f27e2fb841c06b0dab38d9a120f1d9ab78a35adb83d59a5d9a5	2026-11-06 12:15:33.135	2026-10-30 12:29:29.044	7a89fdbd-8134-4bdf-bf6a-1ea79f7da63c	2026-10-30 12:15:33.138	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
7a89fdbd-8134-4bdf-bf6a-1ea79f7da63c	33375df0-2603-4590-94de-6815aed1d13c	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	1e426cba5be7aa5dd1f09d417fe53cf759e4dbb6c3be83cd3f3f8d2e1fcaaad2	2026-11-06 12:29:28.981	2026-10-30 12:29:44.948	6db5acb5-693b-46f9-83ac-eb4ae90d6444	2026-10-30 12:29:28.989	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
6db5acb5-693b-46f9-83ac-eb4ae90d6444	ebe69721-0a49-452e-a118-a32049911514	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	21e87fb0827fc4a67939baac590086bb193b85cead71afa88fc208dbc1298214	2026-11-06 12:29:44.944	2026-10-30 12:31:45.363	3a38e576-c7ea-498f-baf9-497d96e8f962	2026-10-30 12:29:44.95	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
1631c051-4973-4e7c-9306-b73b1c0b88c6	5f000cd3-a8d7-4a67-9ae5-4e89d6c81603	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	ed66412401dda7ef2af4ee117945a06ee87f3f20639d8e7d5ec1fe3938c5ab15	2026-11-06 12:50:37.552	2026-10-30 12:51:10.143	68c1a1ec-1c8c-4d5a-ae83-5203508c4383	2026-10-30 12:50:37.559	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
3a38e576-c7ea-498f-baf9-497d96e8f962	0052f33a-0a8f-4948-861f-f33f79319906	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	6dafc26ff32f5143a1908956f5b3850302e7a1c432c71618a39ca9d3f854dc97	2026-11-06 12:31:45.347	2026-10-30 12:31:49.979	0af089c8-19e9-419b-9a2e-d4bc2a9d495f	2026-10-30 12:31:45.354	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
e73b1963-a531-480d-8425-6fbb17e84c7b	5dc825cc-be74-4df2-800d-7866848444e7	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	18af798534fbb52869396251906bd1c8caa4afaf68991e6edd85f65b9039b04b	2026-11-06 07:12:28.091	2026-10-30 12:34:33.215	\N	2026-10-30 07:12:28.094	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
c93a4868-3eb8-4926-9f67-32722e134e3c	d079fa47-bd19-4f8e-a273-a8bc8538538a	c5e740ee-d959-4019-8117-cebecb829829	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	d614f2b72ef570bf4a40c0909328bfb26a3748c1afa1018f637ed3b062d8d51b	2026-11-06 07:04:58.623	2026-10-30 12:34:33.215	\N	2026-10-30 07:04:58.625	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
0af089c8-19e9-419b-9a2e-d4bc2a9d495f	e7ab7927-77d4-44b6-9bc0-4925f721da92	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	96ca178a5f59291391d385f7acb3c5d8b39c51e1208329d8e333b0a39e587ccf	2026-11-06 12:31:49.971	2026-10-30 12:44:00.644	94c606aa-35ee-415e-ad9e-85263c6e2000	2026-10-30 12:31:49.977	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
41ca8cd0-384d-49d6-a7eb-911facfd3ff0	99e96926-af11-465e-ae2e-2d8930b25c82	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	93409341178781f1dfe7b275c333fa37837fb461d4986f54de06b06e0a83f3be	2026-11-06 12:51:10.115	\N	\N	2026-10-30 12:51:10.121	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
725cbeb3-d0fd-4e64-95c9-7095587b5560	9e295010-83f1-498c-a2dc-a3baf3215b5a	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	a5628cda6a9c2981b2ad76a2fb3c4297b870f6f5d83ad6669acd7aaac5c49f7a	2026-11-06 12:51:38.242	\N	\N	2026-10-30 12:51:38.257	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
54ee0f9b-9e5c-4a7c-a1ea-269fcbcf4ed3	11abc199-ed1e-42da-9177-f1942b9ce1d7	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	104d2ae722c63dcdf8b740bbe235eee72347f1fe326d016828d00681e5577ce5	2026-11-06 12:51:25.739	\N	\N	2026-10-30 12:51:25.745	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
68c1a1ec-1c8c-4d5a-ae83-5203508c4383	794bbf86-5f41-4cdf-9558-e42e20a7ebe9	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	c23be3f0c1670214d74a601ff1d19890030466576db9c7064b1a69a325245d06	2026-11-06 12:51:10.115	2026-10-30 12:51:25.792	049a6f20-74ed-477c-af48-fff18c9f43ac	2026-10-30 12:51:10.124	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
fa74e8b8-49f4-4d90-8cc6-b9b6c1d50639	488bd5e1-a5d5-46fe-8308-91d62012af3e	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e52c87a43914539fe0d98a9d4b1b148252c7736dadc8d78e3cba0fbcacebc6fd	2026-11-06 12:51:51.739	\N	\N	2026-10-30 12:51:51.749	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
049a6f20-74ed-477c-af48-fff18c9f43ac	a2ae6c54-aebe-40e0-b30c-424f22f4c09e	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	f46ad5d839d37b217a2fe304c8b65272a81c0e6011715e090cbea307ef394a8f	2026-11-06 12:51:25.79	2026-10-30 12:51:38.28	d4756af9-c583-4427-8817-433bbd861657	2026-10-30 12:51:25.796	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
8b48fbb4-6efc-454c-8bd2-8704e6709399	feeadf29-d50b-4500-b060-7ee66a3c6f33	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	632f22f9ad2fb35452a16b4faa8e471f1691107e951352138f3493adf460f83f	2026-11-06 12:52:03.392	\N	\N	2026-10-30 12:52:03.402	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
58ffea38-4573-4d51-a62c-8d5781064d43	cd84fd8f-75ab-4232-80f2-b4892a106c7e	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	7f5914b49af489b38e270b3efcfafad35ce24b170ad4d7b25b372520f70c2356	2026-11-06 12:29:28.983	2026-10-30 12:59:51.816	\N	2026-10-30 12:29:28.99	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
d4756af9-c583-4427-8817-433bbd861657	e68b481c-392e-46a1-a73b-61340de62f5e	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	ef4f3e2eea791335000e2384c091bff36068e4365c6b0db1a6d7ec264b90ca7f	2026-11-06 12:51:38.275	2026-10-30 12:51:51.809	5b0fdba1-c359-4634-97b7-d104a16d2339	2026-10-30 12:51:38.284	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
5b0fdba1-c359-4634-97b7-d104a16d2339	aa9bef35-deab-4032-aed3-72836b419f82	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	f7c34a936f1cc67183546cc38a21ef91c4be2bdd353977140bbdd5cea7a6f410	2026-11-06 12:51:51.806	2026-10-30 12:52:03.434	a15bc5cb-751c-4cbc-a6f8-00f5fea890a7	2026-10-30 12:51:51.815	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
94c606aa-35ee-415e-ad9e-85263c6e2000	fef75b1c-9032-4166-84c8-9433b424b636	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2543b67c7184d0ada0b34c91bf3a2a69f8b3226fcbd9b7845410363334ee5554	2026-11-06 12:44:00.523	2026-10-30 12:59:36.288	412b75d6-eb80-40cb-8731-4bbf5b276f41	2026-10-30 12:44:00.529	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
412b75d6-eb80-40cb-8731-4bbf5b276f41	ccc544d8-42f0-4367-872b-886555f408ba	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e3cfce20516159a9635653543e81bb1c9672634ec01392e8984e88f27ec66bef	2026-11-06 12:59:36.26	2026-10-30 12:59:51.789	156386fe-ff60-4461-93a7-a053ef7759d5	2026-10-30 12:59:36.262	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
6ecdc6c3-391e-4424-88ee-4fa67ea3c3fa	a12b5d59-f5db-4c93-b8d8-bef3fa35e8b7	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	3311cb71d56c71863d78bf3636b7c17dc4e88902da629087838d8556168673f1	2026-11-06 12:29:44.894	2026-10-30 12:59:51.816	\N	2026-10-30 12:29:44.902	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
e3a75f5a-692a-4df0-8997-8f72a484625f	8a07654e-ec43-4749-823e-a103e6f2378e	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	feae529e28faa671505070cc5aa72ae1394c0433b97760d6ab070ef19b678a2f	2026-11-06 12:44:00.563	2026-10-30 12:59:51.816	\N	2026-10-30 12:44:00.58	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
d2caf166-4ade-4ab0-8629-4f8eb1fdc838	5491312b-400e-48f8-87a0-22d3b87d1b9c	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	06835f36f387b84b5ecbd7e499c56f225005a08db3c8d7e110b31a853d79c2c4	2026-11-06 12:31:45.259	2026-10-30 12:59:51.816	\N	2026-10-30 12:31:45.263	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
c55fb2dd-0455-400b-b820-c0aa07f92125	0d55ffe2-343f-4653-860d-8767a911da92	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	9d9d7f1b1c4aae1558909e4142fd7fc51f66c6ec181d202f0e4e1607c4859b60	2026-11-06 12:31:49.957	2026-10-30 12:59:51.816	\N	2026-10-30 12:31:49.963	::1	Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36
156386fe-ff60-4461-93a7-a053ef7759d5	b3aa0153-3cac-4163-96d0-652a6a900ff2	13edb2fb-d926-4d31-8b1a-e1f6f8c0b8d1	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	66eddca9b4283fcfff4b9eb5d57b8e0b7ec0dda6b0c74d509e7b53ad939f980d	2026-11-06 12:59:51.785	2026-10-30 12:59:51.816	\N	2026-10-30 12:59:51.787	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
b94299a2-b851-4060-b33d-b8b414de37a7	e5a370b0-ea8d-43a2-a677-5547942fa892	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	34bfb45503a385504a89235a52c3fc332fb491f1dcafc2c583cc0b84576cbcd6	2026-11-06 13:01:42.517	\N	\N	2026-10-30 13:01:42.526	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
0a4aca67-42e5-4ccc-8275-21e61491eb11	d9a4e1cf-8477-48c1-9933-f71babb07050	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	c3bd9e804616c06cfdb51e61e8826523175ce452a0836608dcdcd32da786533f	2026-11-06 13:47:32.415	2026-10-30 14:02:32.379	6e7b1fdc-6709-4143-9ee0-f3508d865832	2026-10-30 13:47:32.418	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
a15bc5cb-751c-4cbc-a6f8-00f5fea890a7	b74b0668-23cc-4dd2-8c9a-842da74d7853	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	475c4f641c7e2a8d8bc7d15ac00d921d70101532577a5e04bf9f9a692088a4ac	2026-11-06 12:52:03.413	2026-10-30 13:01:42.56	f84efcd6-eaa5-4d7d-9792-f9f2ddf40b00	2026-10-30 12:52:03.423	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
f84efcd6-eaa5-4d7d-9792-f9f2ddf40b00	6755dc9e-8c68-4948-9189-fa51ff686130	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	c77c5d8c4ebdc4cb7919b3537cd9050b3786af4061b6f2f20ec956ac938006ae	2026-11-06 13:01:42.492	2026-10-30 13:17:32.454	b84573bc-69c2-4b66-bd8f-ac725fff6bc1	2026-10-30 13:01:42.503	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
b84573bc-69c2-4b66-bd8f-ac725fff6bc1	c23759e1-c280-492a-85f5-c54b7381baf6	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	fd4fe61c6f11a726fc95fa6c893ea3b437eea81dd1202d892e48c75aca213447	2026-11-06 13:17:32.434	2026-10-30 13:32:32.382	96e89fa8-8839-4957-9c80-241a4f6f435e	2026-10-30 13:17:32.437	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
96e89fa8-8839-4957-9c80-241a4f6f435e	5adfb99d-206b-4eb0-817b-6d38964a828f	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	db743a3ac4838e8f6d85d627ad53ca3e1250d0e44e679a76f58b1ff0fd293980	2026-11-06 13:32:32.374	2026-10-30 13:47:32.421	0a4aca67-42e5-4ccc-8275-21e61491eb11	2026-10-30 13:32:32.38	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
6e7b1fdc-6709-4143-9ee0-f3508d865832	fd8248f6-865c-46d6-9d76-c6b21f657579	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	549cd8b4162a42c31999b2ff07f1311d69f100ba5ed1b1c553329b80748bf7c2	2026-11-06 14:02:32.37	2026-10-30 14:17:32.416	c4aeabb3-a6c7-43dd-99a2-c192bf76a886	2026-10-30 14:02:32.378	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
c4aeabb3-a6c7-43dd-99a2-c192bf76a886	20d176db-07ad-48f1-a973-b6d908746f11	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	a009f358d8f57c58c747d5004bb08252757258d09f85c4db311744e2f764b39e	2026-11-06 14:17:32.409	2026-10-30 14:32:32.344	82b168ff-33bf-4c7c-a820-97a7a0259365	2026-10-30 14:17:32.414	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
82b168ff-33bf-4c7c-a820-97a7a0259365	a891f5a9-3c63-45d6-9cef-401407ea43ed	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	8fb1bf6af762a19bc92e492438e0e2d2eb19570004e4a340c3475e2e02b5ee94	2026-11-06 14:32:32.332	2026-10-30 14:47:32.386	b2229ae4-967e-4c55-8917-2694cd6df4e4	2026-10-30 14:32:32.343	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
b2229ae4-967e-4c55-8917-2694cd6df4e4	4938108b-2e94-44f0-ab2e-485ce6284766	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	5a13fce885ea904f518b17e38badfcf2dda857eedaab9f92084a11a833c39ccd	2026-11-06 14:47:32.376	2026-10-30 15:02:32.358	b25d1e9d-ff4a-4e73-9637-9baa38e6b4b7	2026-10-30 14:47:32.381	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
7aab6383-f476-441c-8e66-299163e23457	91baae8f-5651-4a55-b924-43140a784e45	f141b3f6-6be0-4f5d-8104-8a022d01eb98	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	07ac4f6cd69487d44acf0e58d42fdf057b844825856e7621228eb00388311783	2026-11-06 15:33:20.387	\N	\N	2026-10-30 15:33:20.394	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
e3988d02-a937-4a4b-ad1c-090b0a037cc8	a114e163-2436-4586-827d-48b7ffeb83c6	f141b3f6-6be0-4f5d-8104-8a022d01eb98	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	ef7368eee38f97cb5eee2f2d35a57a95bd79a79f0c99b802ff1464a0e25a386f	2026-11-06 15:33:20.385	\N	\N	2026-10-30 15:33:20.393	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
05ad9f27-67b0-4ca4-aa8a-a255ff8f3bdb	40fd77db-680c-4d6c-ab81-f1037902eea4	f141b3f6-6be0-4f5d-8104-8a022d01eb98	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	842cb1801dc30c8853906b57b461740f17e4ea5c14dcb731cb82e199795c21da	2026-11-06 15:06:42.233	2026-10-30 15:33:20.41	7aab6383-f476-441c-8e66-299163e23457	2026-10-30 15:06:42.238	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
b25d1e9d-ff4a-4e73-9637-9baa38e6b4b7	1162f0b8-dacd-4ae8-b481-cf0f62a43f4c	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	9ce03015e4323b343fb09162762f21792fb68440a10768a98f0e2362e49bc6f8	2026-11-06 15:02:32.349	2026-10-30 15:33:33.51	2edf670e-c918-42de-b711-92ac661b8ad2	2026-10-30 15:02:32.359	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
c8d6d6e8-d8d0-445e-9012-f8c7ae203ff2	e28b0b9e-35cb-4a24-bd6f-3c876a182631	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	37b8bf985665a9c6cde5d39926f46bf34e819bcdd1849344210e67afd39964ec	2026-11-06 18:46:32.672	2026-10-30 19:01:33.126	39fbcf82-4905-4815-9dc0-9df6ba29ad52	2026-10-30 18:46:32.674	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
2edf670e-c918-42de-b711-92ac661b8ad2	14f77dec-bac3-4619-b42d-0761da0221c9	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	8267df7e50d3388d2ec6efc69e3b1bec3fa9d1f3fa355838a943b571c1ef5441	2026-11-06 15:33:33.503	2026-10-30 18:46:32.757	c8d6d6e8-d8d0-445e-9012-f8c7ae203ff2	2026-10-30 15:33:33.511	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
90e257fb-f19c-4c1f-bfde-59bd38efe902	2fc0dba7-7281-4fd2-b66a-0a6a62f003a7	fae95e36-bc93-4633-be04-f8b866b4ec23	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	1aa38180063e0229356433632b2b0a426b77b4eba2ce8fd7f8db7a1fe6ada9fd	2026-11-06 18:57:11.212	\N	\N	2026-10-30 18:57:11.213	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
1bac0d54-d0c5-4f37-a996-8988d916c624	5f9d38c4-aaa1-4896-b6d3-de53bb7aa115	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e70263d5c4af62f99be5943c0b694b56b94d2fa9ca67aa718ff8a530d14afbbd	2026-11-06 19:01:33.443	\N	\N	2026-10-30 19:01:33.46	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
39fbcf82-4905-4815-9dc0-9df6ba29ad52	4b43afd5-91f6-4843-94b5-bb1d19d8dbe0	a656172a-1c0a-435b-a376-db7d0ea70945	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	56ee0716089f2caa341637bf082140537afcdec576e17c0f740233665f7fc27d	2026-11-06 19:01:33.036	2026-10-30 19:01:33.457	1bac0d54-d0c5-4f37-a996-8988d916c624	2026-10-30 19:01:33.054	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
26f98844-749e-4d08-8561-24cc2466c641	95622fd6-e912-460d-893a-b635c874685a	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	3d11e5ada71f1068f9208865d11ad5e0df8a88129b7c798afb3c02c08c05ebff	2026-11-06 19:17:21.355	2026-10-30 19:29:29.816	fc5e9cd4-9520-4e10-bf97-4eb15819e43a	2026-10-30 19:17:21.362	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
f0da4b0a-2598-4254-9b77-a198164ca83d	1a072124-70a3-4752-b953-28695d64af1c	02849021-554e-4f1b-96e2-1340e6724787	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	282236fbb49f9dbe90bb59726f6d2cee833b7a4b8efb313e9f84f2f5ba76d470	2026-11-06 19:29:57.733	\N	\N	2026-10-30 19:29:57.738	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
fae99dbe-4159-4864-8f43-a5b54ea398e3	4b3f1a77-7e23-4235-8e19-cab33ef41eeb	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	a46f11739a2f1a15b1cd5365c14712e05537212ba5a8c0311b4251a7a9f60927	2026-11-06 19:40:27.709	\N	\N	2026-10-30 19:40:27.713	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
fc5e9cd4-9520-4e10-bf97-4eb15819e43a	5fd8f3b9-e865-481c-a081-a44f28976563	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	1bc66eb2f0129feeb99434699683cd42f84144f45faa79eb022dcd20fbe886ee	2026-11-06 19:29:29.802	2026-10-30 19:40:27.726	cf548a07-35d0-4b6d-91b3-9577477df0b9	2026-10-30 19:29:29.808	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
86e92c05-e652-4131-8e15-4ae84efc4fc8	83ae1cfd-3a6e-4ddc-8876-bcdf44535740	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	d6b14b21a130f0a947cbac60ccc3cdae821fe71defdee9a179eca7034ddad8f3	2026-11-06 19:46:10.926	\N	\N	2026-10-30 19:46:10.93	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
cf548a07-35d0-4b6d-91b3-9577477df0b9	1b940f32-7bc6-41c6-ae49-650d73ce9f8e	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	5da394ff1869e1045b2192cccae9cc9ba133ece278c05c202230c7a112706240	2026-11-06 19:40:27.708	2026-10-30 19:46:10.947	66378708-a70d-40c9-a21e-389de82feaf5	2026-10-30 19:40:27.713	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
a2b51fc3-f7b6-435a-9c52-873bba7727c2	a29a5c32-53e4-453e-8069-a175f2451ee7	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2949e6273235366dd59b64b486c1a3de1c6a8ae868a5e4da8f7d9b25375564c8	2026-11-06 19:46:12.53	\N	\N	2026-10-30 19:46:12.534	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
2258c66b-d697-4d50-9427-86cf246d8522	1d78ab71-22ff-4ae2-b53f-bb22de5eeab8	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	8732f3fb154db6cdf78463822539ff3e0dc0d761db22aeba61932b177e0d9647	2026-11-06 19:46:12.686	\N	\N	2026-10-30 19:46:12.69	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
66378708-a70d-40c9-a21e-389de82feaf5	34dd9bfb-9d3a-4395-b796-6bacd4e81bc8	23533f2b-c575-4195-8bb9-55151757ea60	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	e0a02b94aa9e21a62d78f5606117bd7ac6c2d92e2647bbb15e782788f0e9bdf3	2026-11-06 19:46:10.925	2026-10-30 19:46:12.738	2258c66b-d697-4d50-9427-86cf246d8522	2026-10-30 19:46:10.929	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
2cab11cc-616b-4a0c-a0ee-14818bd6f515	e2c328dc-6328-4c83-9b41-5dedb226f9a0	fe701a9a-a52d-4e7f-830e-d8173c373158	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	413a13c407c1fb999b187cb46edfe4bf1b591bcfb3d8ef2661df36f984b826a7	2026-11-06 21:32:45.59	\N	\N	2026-10-30 21:32:45.592	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.6456
\.


--
-- Data for Name: return_refunds; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.return_refunds (id, "returnLineId", "salePaymentId", method, status, amount, "idempotencyKey", "cashSessionId", "userId", "createdAt", "updatedAt", "confirmedAt", "confirmedBy", "externalReference", notes) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.role_permissions ("roleId", "permissionId", "createdAt") FROM stdin;
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	7e26b78d-0af6-457d-910f-03612d0a8232	2026-10-29 21:23:23.192
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	c563db87-73b4-4941-b881-9937fa3c08ef	2026-10-29 21:23:23.215
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	de706a0a-c8aa-4aac-8775-7df31d0a8726	2026-10-29 21:23:23.228
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	66c1d9f9-f6bd-4a73-ba3d-59e3d18d1abe	2026-10-29 21:23:23.239
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	4e8fcd8e-1a3d-4941-85d5-fc07d41d692c	2026-10-29 21:23:23.25
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	d8d5d613-9612-47d2-ac12-79981a850fc3	2026-10-29 21:23:23.268
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	38e07301-552c-4195-82d4-5b56f7e9e935	2026-10-29 21:23:23.28
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	307b9a70-d72f-4a1b-8896-ec36f6c0cf73	2026-10-29 21:23:23.291
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	f5faf2ec-8114-4f7f-9073-300caf343b7d	2026-10-29 21:23:23.303
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	54ea5545-ebec-4c19-808d-00e49fd0b524	2026-10-29 21:23:23.313
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	584895f5-96e4-453a-bbbf-9e1080ab2108	2026-10-29 21:23:23.323
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	f56a540f-5450-4d2b-8441-fb41769971a5	2026-10-29 21:23:23.334
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	cd54b6d7-4b5d-4ef3-b977-10cd0eecc68c	2026-10-29 21:23:23.345
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	eac5d78f-1402-4bbb-a479-eae8216ac6b4	2026-10-29 21:23:23.355
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	cb408cf3-f817-44bc-98fb-0fc781fa46c7	2026-10-29 21:23:23.366
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	3387f115-b600-442f-8a2c-369a7829512f	2026-10-29 21:23:23.377
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	0f70a62a-90f1-4ee5-b922-c17d4f545519	2026-10-29 21:23:23.388
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	4318285a-fa30-4a1e-ae6d-d2f9b5495b68	2026-10-29 21:23:23.399
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	99f531fc-16dc-4674-979c-bda55257b622	2026-10-29 21:23:23.412
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	b888dca9-efc8-4f75-89f0-a31f1cd3ac7b	2026-10-29 21:23:23.425
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	ab46439a-7b32-49bf-b8f9-ddada1bfc6b2	2026-10-29 21:23:23.435
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	0b7779ab-b0b6-4732-9217-02823e2271d7	2026-10-29 21:23:23.447
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	b88f209a-9edc-4f2f-88af-bb1c2a5c5ea5	2026-10-29 21:23:23.457
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	63abf3dc-25ec-4009-ad00-614b2e76788d	2026-10-29 21:23:23.468
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	d8872829-2edf-4d11-84fa-bd1fb34f53f8	2026-10-29 21:23:23.479
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	ba3fae14-1b73-49cb-b9a0-dc74f81ba02e	2026-10-29 21:23:23.489
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	eccf5582-1c28-454d-a1ee-cba133741bd2	2026-10-29 21:23:23.5
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	950ffa89-31c3-4ca6-87cf-3f3d44c20d08	2026-10-29 21:23:23.51
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	ab583acb-b471-4d87-a8e9-1154ca14a1d7	2026-10-29 21:23:23.521
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	5edfbc6a-03b2-4a59-91ae-e8e9030e8ea5	2026-10-29 21:23:23.531
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	87fd2ec4-781a-4bf3-bfec-ed7d5f9c4a29	2026-10-29 21:23:23.543
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	e09e76ac-24a5-4c5e-b976-ba7db1c0d319	2026-10-29 21:23:23.554
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	96d7dada-bed5-48f9-b16f-7c5100a73946	2026-10-29 21:23:23.564
9657743b-0dc9-40bc-8b63-8e00e36aefc8	307b9a70-d72f-4a1b-8896-ec36f6c0cf73	2026-10-29 21:23:23.579
9657743b-0dc9-40bc-8b63-8e00e36aefc8	54ea5545-ebec-4c19-808d-00e49fd0b524	2026-10-29 21:23:23.589
9657743b-0dc9-40bc-8b63-8e00e36aefc8	f56a540f-5450-4d2b-8441-fb41769971a5	2026-10-29 21:23:23.6
9657743b-0dc9-40bc-8b63-8e00e36aefc8	eac5d78f-1402-4bbb-a479-eae8216ac6b4	2026-10-29 21:23:23.611
9657743b-0dc9-40bc-8b63-8e00e36aefc8	0f70a62a-90f1-4ee5-b922-c17d4f545519	2026-10-29 21:23:23.621
9657743b-0dc9-40bc-8b63-8e00e36aefc8	4318285a-fa30-4a1e-ae6d-d2f9b5495b68	2026-10-29 21:23:23.631
9657743b-0dc9-40bc-8b63-8e00e36aefc8	0b7779ab-b0b6-4732-9217-02823e2271d7	2026-10-29 21:23:23.641
9657743b-0dc9-40bc-8b63-8e00e36aefc8	b88f209a-9edc-4f2f-88af-bb1c2a5c5ea5	2026-10-29 21:23:23.654
9657743b-0dc9-40bc-8b63-8e00e36aefc8	63abf3dc-25ec-4009-ad00-614b2e76788d	2026-10-29 21:23:23.665
9657743b-0dc9-40bc-8b63-8e00e36aefc8	d8872829-2edf-4d11-84fa-bd1fb34f53f8	2026-10-29 21:23:23.676
9657743b-0dc9-40bc-8b63-8e00e36aefc8	ba3fae14-1b73-49cb-b9a0-dc74f81ba02e	2026-10-29 21:23:23.687
9657743b-0dc9-40bc-8b63-8e00e36aefc8	950ffa89-31c3-4ca6-87cf-3f3d44c20d08	2026-10-29 21:23:23.698
9657743b-0dc9-40bc-8b63-8e00e36aefc8	ab583acb-b471-4d87-a8e9-1154ca14a1d7	2026-10-29 21:23:23.708
9657743b-0dc9-40bc-8b63-8e00e36aefc8	5edfbc6a-03b2-4a59-91ae-e8e9030e8ea5	2026-10-29 21:23:23.719
9657743b-0dc9-40bc-8b63-8e00e36aefc8	e09e76ac-24a5-4c5e-b976-ba7db1c0d319	2026-10-29 21:23:23.729
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	0f70a62a-90f1-4ee5-b922-c17d4f545519	2026-10-29 21:23:23.744
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	4318285a-fa30-4a1e-ae6d-d2f9b5495b68	2026-10-29 21:23:23.754
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	b888dca9-efc8-4f75-89f0-a31f1cd3ac7b	2026-10-29 21:23:23.771
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	ab46439a-7b32-49bf-b8f9-ddada1bfc6b2	2026-10-29 21:23:23.787
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	0b7779ab-b0b6-4732-9217-02823e2271d7	2026-10-29 21:23:23.798
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	eccf5582-1c28-454d-a1ee-cba133741bd2	2026-10-29 21:23:23.811
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	950ffa89-31c3-4ca6-87cf-3f3d44c20d08	2026-10-29 21:23:23.823
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	ab583acb-b471-4d87-a8e9-1154ca14a1d7	2026-10-29 21:23:23.845
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	5edfbc6a-03b2-4a59-91ae-e8e9030e8ea5	2026-10-29 21:23:23.861
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	e09e76ac-24a5-4c5e-b976-ba7db1c0d319	2026-10-29 21:23:23.878
be1740b8-6636-4c48-a12c-77be862d259a	307b9a70-d72f-4a1b-8896-ec36f6c0cf73	2026-10-29 21:23:23.924
be1740b8-6636-4c48-a12c-77be862d259a	f5faf2ec-8114-4f7f-9073-300caf343b7d	2026-10-29 21:23:23.94
be1740b8-6636-4c48-a12c-77be862d259a	54ea5545-ebec-4c19-808d-00e49fd0b524	2026-10-29 21:23:23.968
be1740b8-6636-4c48-a12c-77be862d259a	584895f5-96e4-453a-bbbf-9e1080ab2108	2026-10-29 21:23:23.984
be1740b8-6636-4c48-a12c-77be862d259a	f56a540f-5450-4d2b-8441-fb41769971a5	2026-10-29 21:23:23.996
be1740b8-6636-4c48-a12c-77be862d259a	cd54b6d7-4b5d-4ef3-b977-10cd0eecc68c	2026-10-29 21:23:24.007
be1740b8-6636-4c48-a12c-77be862d259a	eac5d78f-1402-4bbb-a479-eae8216ac6b4	2026-10-29 21:23:24.018
be1740b8-6636-4c48-a12c-77be862d259a	cb408cf3-f817-44bc-98fb-0fc781fa46c7	2026-10-29 21:23:24.03
be1740b8-6636-4c48-a12c-77be862d259a	3387f115-b600-442f-8a2c-369a7829512f	2026-10-29 21:23:24.05
be1740b8-6636-4c48-a12c-77be862d259a	4318285a-fa30-4a1e-ae6d-d2f9b5495b68	2026-10-29 21:23:24.059
be1740b8-6636-4c48-a12c-77be862d259a	0b7779ab-b0b6-4732-9217-02823e2271d7	2026-10-29 21:23:24.069
be1740b8-6636-4c48-a12c-77be862d259a	950ffa89-31c3-4ca6-87cf-3f3d44c20d08	2026-10-29 21:23:24.077
be1740b8-6636-4c48-a12c-77be862d259a	e09e76ac-24a5-4c5e-b976-ba7db1c0d319	2026-10-29 21:23:24.087
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.roles (id, name, description, "isSystem", "createdAt", "updatedAt") FROM stdin;
7f625638-d8f8-4ecd-8c65-9b3904fd17d6	ADMIN	Administração da farmácia, utilizadores e configurações	t	2026-10-29 21:23:23.175	2026-10-29 21:23:40.175
9657743b-0dc9-40bc-8b63-8e00e36aefc8	PHARMACIST	Operações profissionais permitidas	t	2026-10-29 21:23:23.572	2026-10-29 21:23:40.45
4c29e1ba-041c-4c4e-bfcd-7a4efe5a683e	CASHIER	Operações de venda e caixa	t	2026-10-29 21:23:23.738	2026-10-29 21:23:40.572
be1740b8-6636-4c48-a12c-77be862d259a	STOCK_MANAGER	Stock, lotes e recepção de mercadoria	t	2026-10-29 21:23:23.903	2026-10-29 21:23:40.667
\.


--
-- Data for Name: sale_line_lots; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.sale_line_lots (id, "saleLineId", "lotId", quantity) FROM stdin;
9ec647e9-179d-4855-a819-2f634e28c15e	99fca399-b3f8-4da4-b93c-72337cfbef0a	79f46333-337e-4489-bec5-db8307aeb9db	2
d3ef9f6b-80ac-4711-a146-9392a86c7fb1	e28a51c7-75f3-44bb-9655-ea4047a898dc	79f46333-337e-4489-bec5-db8307aeb9db	8
87d33529-6027-4233-ad9e-57b4ce3f7fd0	f5d67801-2729-45cf-8564-aac97d9cd6e5	79f46333-337e-4489-bec5-db8307aeb9db	2
833b0d85-8da8-4229-9a1c-fe0ef789ae48	07bbaf87-5337-4f48-ab8c-c5ce05340a94	79f46333-337e-4489-bec5-db8307aeb9db	2
6cf1cb4b-ba17-4bcd-a87b-ad7f6089cab3	a86c3100-2a02-410e-a7cb-4ef1b6e7948a	79f46333-337e-4489-bec5-db8307aeb9db	3
f778e5bf-185d-41f2-8061-0c7063cfea60	6dca3243-7598-4e90-81ad-e83c8a0a904a	79f46333-337e-4489-bec5-db8307aeb9db	1
8377c6c4-df58-4416-bcd7-861ab9a66aeb	6cf7e80f-f02a-4ad1-bcc1-26cb5041c06a	79f46333-337e-4489-bec5-db8307aeb9db	1
90cf6429-aefc-47bf-bcc4-56dcf2445b1a	0aed0051-107a-47e4-8585-ef408ecc9056	79f46333-337e-4489-bec5-db8307aeb9db	1
e6d86629-1c96-44b4-b325-629d461b61df	92bf29d9-36f3-4d8b-8207-bd5ff55762d3	79f46333-337e-4489-bec5-db8307aeb9db	2
49010b2a-e388-4cec-8a6a-a49a37bbc824	332a5be0-0dc2-46b8-adfd-59f73c7057f2	79f46333-337e-4489-bec5-db8307aeb9db	3
cf2da163-05b3-4543-b404-93ceac18da30	0aa8bf24-b6da-44a4-b6b2-7066bcbddd6c	79f46333-337e-4489-bec5-db8307aeb9db	1
7ab2d70a-dbdf-48b7-952a-5b4e71f227fc	5b5cfe55-adaa-4f15-8706-a2ee1553444c	79f46333-337e-4489-bec5-db8307aeb9db	1
\.


--
-- Data for Name: sale_lines; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.sale_lines (id, "saleId", "productId", quantity, "unitPrice", discount, subtotal) FROM stdin;
99fca399-b3f8-4da4-b93c-72337cfbef0a	fd611121-ebc2-4520-a578-412179ec1a48	aa99628b-1ac8-4e36-9700-9c9abb66dc98	2	55.00	0.00	110.00
e28a51c7-75f3-44bb-9655-ea4047a898dc	3ca11321-da07-4e7d-b771-94efb352f30a	aa99628b-1ac8-4e36-9700-9c9abb66dc98	10	55.00	0.00	550.00
e0ffed05-9ba7-44f6-930a-661dfd93dc3e	7c01806c-1a03-4136-8435-c126bb30a9d9	aa99628b-1ac8-4e36-9700-9c9abb66dc98	2	55.00	0.00	110.00
f5d67801-2729-45cf-8564-aac97d9cd6e5	cab83523-d8aa-4be9-87e1-9770edb4b1a2	aa99628b-1ac8-4e36-9700-9c9abb66dc98	2	55.00	0.00	110.00
07bbaf87-5337-4f48-ab8c-c5ce05340a94	5b7be39e-750f-4462-b69c-be68012fa2d0	aa99628b-1ac8-4e36-9700-9c9abb66dc98	2	55.00	0.00	110.00
a86c3100-2a02-410e-a7cb-4ef1b6e7948a	08ead35e-4f3e-40c9-bdda-5cb59cce84ce	aa99628b-1ac8-4e36-9700-9c9abb66dc98	3	55.00	0.00	165.00
6dca3243-7598-4e90-81ad-e83c8a0a904a	0db6bc79-9f10-40f5-bad2-b371278ef91c	aa99628b-1ac8-4e36-9700-9c9abb66dc98	1	55.00	0.00	55.00
0d3d41f8-122c-47e6-b7ce-0a3347987903	642a52d5-4364-4037-acc5-89253b9ee735	aa99628b-1ac8-4e36-9700-9c9abb66dc98	4	55.00	0.00	220.00
6cf7e80f-f02a-4ad1-bcc1-26cb5041c06a	f14537c2-3fa9-4e51-8082-50737450f0ff	aa99628b-1ac8-4e36-9700-9c9abb66dc98	1	55.00	0.00	55.00
03717939-c710-4566-af83-527b37d10b4a	32fb9014-a041-436e-9f37-49906d925d2d	aa99628b-1ac8-4e36-9700-9c9abb66dc98	4	55.00	0.00	220.00
0593a1a4-7ddc-4a3d-86ff-8ca6d8bb0953	bbe56041-7092-407f-a779-80d25f39570e	aa99628b-1ac8-4e36-9700-9c9abb66dc98	4	55.00	0.00	220.00
0aed0051-107a-47e4-8585-ef408ecc9056	1ad7958c-b3e4-4012-b934-1337a09b6adc	aa99628b-1ac8-4e36-9700-9c9abb66dc98	1	55.00	0.00	55.00
1fd285c5-86df-471f-9991-dc5a36806beb	85f767a3-ddd8-4696-b487-a758f3832814	aa99628b-1ac8-4e36-9700-9c9abb66dc98	1	55.00	0.00	55.00
92bf29d9-36f3-4d8b-8207-bd5ff55762d3	e55d8231-34a4-405e-992e-eacd97bf786e	aa99628b-1ac8-4e36-9700-9c9abb66dc98	2	55.00	0.00	110.00
332a5be0-0dc2-46b8-adfd-59f73c7057f2	17223a3f-784a-41ab-b094-b566c413bbee	aa99628b-1ac8-4e36-9700-9c9abb66dc98	3	55.00	0.00	165.00
0aa8bf24-b6da-44a4-b6b2-7066bcbddd6c	2731af07-d7fc-4c07-86d8-0140af35ffec	aa99628b-1ac8-4e36-9700-9c9abb66dc98	1	55.00	0.00	55.00
5b5cfe55-adaa-4f15-8706-a2ee1553444c	91a92943-f9b4-46cf-990d-d6722f16ccfb	aa99628b-1ac8-4e36-9700-9c9abb66dc98	1	55.00	0.00	55.00
\.


--
-- Data for Name: sale_payments; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.sale_payments (id, "saleId", "cashSessionId", method, amount, "createdAt", "userId", "idempotencyKey") FROM stdin;
e08335bb-adff-4e3e-8d3f-9717ee3f1be5	cab83523-d8aa-4be9-87e1-9770edb4b1a2	234fed98-62d1-44a3-874a-91ba88b7bece	CASH	110.00	2026-10-30 06:02:04.509	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	54e6db1b-35cc-49db-b5e9-9ebaaab7a01d
2f3f4544-0e30-49b3-9b0a-f9bef3c88ec6	5b7be39e-750f-4462-b69c-be68012fa2d0	234fed98-62d1-44a3-874a-91ba88b7bece	CASH	110.00	2026-10-30 06:04:46.987	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	9642ee1f-4c76-4065-bae0-6244f4812d17
0964a386-29a2-4422-92e0-47adbd4f10e0	08ead35e-4f3e-40c9-bdda-5cb59cce84ce	234fed98-62d1-44a3-874a-91ba88b7bece	CASH	165.00	2026-10-30 07:22:35.136	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	14f497dc-a783-4dfa-98dc-f26e0b630c30
dcb9a631-e00c-44f5-b320-ccd756f40733	0db6bc79-9f10-40f5-bad2-b371278ef91c	234fed98-62d1-44a3-874a-91ba88b7bece	CASH	55.00	2026-10-30 07:28:23.853	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	13361f84-1328-4958-8bec-29b28d61041e
5c344af1-7013-4aa5-87d1-cf33386af4d1	f14537c2-3fa9-4e51-8082-50737450f0ff	234fed98-62d1-44a3-874a-91ba88b7bece	EMOLA	55.00	2026-10-30 07:29:08.852	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	003867e8-c904-4642-923d-eae5c7688af1
934b0935-5400-4ad5-99c0-84d69a24b8e9	1ad7958c-b3e4-4012-b934-1337a09b6adc	234fed98-62d1-44a3-874a-91ba88b7bece	MPESA	55.00	2026-10-30 12:44:46.929	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	5b1969dd-01fb-4337-998b-b7fbaad33442
b66d61c4-8953-435d-a96e-0103a2957f37	e55d8231-34a4-405e-992e-eacd97bf786e	234fed98-62d1-44a3-874a-91ba88b7bece	MPESA	110.00	2026-10-30 12:57:47.644	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2a482f71-fd6a-44c8-be5b-229a47a791e1
7572e8ff-940b-4a55-bf5c-7f2cd9f83c8e	17223a3f-784a-41ab-b094-b566c413bbee	234fed98-62d1-44a3-874a-91ba88b7bece	MPESA	165.00	2026-10-30 15:33:35.651	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	8d77bd58-677a-4d92-add7-cb3147fee110
a2e387b7-3d24-483c-8230-0de1d1e69d48	2731af07-d7fc-4c07-86d8-0140af35ffec	234fed98-62d1-44a3-874a-91ba88b7bece	MPESA	55.00	2026-10-30 18:46:33.114	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	5578d347-2a10-4d88-a1f4-dc824f87ebf2
15c895c3-a936-4bc4-a977-2d812d820c36	91a92943-f9b4-46cf-990d-d6722f16ccfb	234fed98-62d1-44a3-874a-91ba88b7bece	MPESA	55.00	2026-10-30 18:46:33.145	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	760b71da-abcb-4739-8623-2cad6ce86ebd
\.


--
-- Data for Name: sale_return_lines; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.sale_return_lines (id, "returnId", "saleLineId", "productId", quantity, "quantityInspected", "unitPrice", discount, subtotal, condition, "lotId", "lotNumber", "expiryDate") FROM stdin;
\.


--
-- Data for Name: sale_returns; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.sale_returns (id, "pharmacyId", "saleId", "returnNumber", status, reason, "totalRefund", "userId", "confirmationKey", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.sales (id, "pharmacyId", "saleNumber", status, subtotal, discount, total, notes, "userId", "createdAt", "updatedAt") FROM stdin;
fd611121-ebc2-4520-a578-412179ec1a48	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000001	CONFIRMED	110.00	0.00	110.00	Sincronizada do modo offline	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-29 21:31:24.301	2026-10-29 21:31:24.359
3ca11321-da07-4e7d-b771-94efb352f30a	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000002	CONFIRMED	550.00	0.00	550.00	Sincronizada do modo offline	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-29 21:32:55.36	2026-10-29 21:32:55.395
7c01806c-1a03-4136-8435-c126bb30a9d9	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000003	DRAFT	110.00	0.00	110.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 05:59:34.449	2026-10-30 05:59:34.449
cab83523-d8aa-4be9-87e1-9770edb4b1a2	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000004	CONFIRMED	110.00	0.00	110.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 06:02:04.272	2026-10-30 06:02:04.411
5b7be39e-750f-4462-b69c-be68012fa2d0	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000005	CONFIRMED	110.00	0.00	110.00	Sincronizada do modo offline	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 06:04:46.407	2026-10-30 06:04:46.612
08ead35e-4f3e-40c9-bdda-5cb59cce84ce	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000006	CONFIRMED	165.00	0.00	165.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 07:22:34.935	2026-10-30 07:22:35.069
0db6bc79-9f10-40f5-bad2-b371278ef91c	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000007	CONFIRMED	55.00	0.00	55.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 07:28:23.624	2026-10-30 07:28:23.791
642a52d5-4364-4037-acc5-89253b9ee735	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000008	DRAFT	220.00	0.00	220.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 07:28:57.318	2026-10-30 07:28:57.318
f14537c2-3fa9-4e51-8082-50737450f0ff	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000009	CONFIRMED	55.00	0.00	55.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 07:29:08.703	2026-10-30 07:29:08.782
32fb9014-a041-436e-9f37-49906d925d2d	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000010	DRAFT	220.00	0.00	220.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 12:44:31.343	2026-10-30 12:44:31.343
bbe56041-7092-407f-a779-80d25f39570e	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000011	DRAFT	220.00	0.00	220.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 12:44:39.7	2026-10-30 12:44:39.7
1ad7958c-b3e4-4012-b934-1337a09b6adc	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000012	CONFIRMED	55.00	0.00	55.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 12:44:46.83	2026-10-30 12:44:46.878
85f767a3-ddd8-4696-b487-a758f3832814	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000013	DRAFT	55.00	0.00	55.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 12:52:20.841	2026-10-30 12:52:20.841
e55d8231-34a4-405e-992e-eacd97bf786e	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000014	CONFIRMED	110.00	0.00	110.00	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 12:57:47.476	2026-10-30 12:57:47.595
17223a3f-784a-41ab-b094-b566c413bbee	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000015	CONFIRMED	165.00	0.00	165.00	Sincronizada do modo offline	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 15:33:35.422	2026-10-30 15:33:35.586
2731af07-d7fc-4c07-86d8-0140af35ffec	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000016	CONFIRMED	55.00	0.00	55.00	Sincronizada do modo offline	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 18:46:32.95	2026-10-30 18:46:33.02
91a92943-f9b4-46cf-990d-d6722f16ccfb	ca23c44a-9483-44c3-bc54-f4d994150255	VND-000017	CONFIRMED	55.00	0.00	55.00	Sincronizada do modo offline	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 18:46:33.055	2026-10-30 18:46:33.074
\.


--
-- Data for Name: stock_lots; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.stock_lots (id, "pharmacyId", "productId", "purchaseLineId", "lotNumber", "expiryDate", "quantityReceived", "quantityAvailable", "unitCost", status, "createdAt", "updatedAt", "quantityReceivedFromLine", "innerCount", "qrCode", "totalUnits", "unitsPerInner") FROM stdin;
79f46333-337e-4489-bec5-db8307aeb9db	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	\N	LOTE-TESTE-01	2027-10-29 21:30:31.14	100	93	30.00	ACTIVE	2026-10-29 21:30:31.14	2026-10-30 18:46:33.064	0	\N	COLGATE-TESTE-01	100	\N
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.stock_movements (id, "pharmacyId", "productId", "lotId", type, quantity, "referenceId", "referenceType", notes, "userId", "createdAt") FROM stdin;
d157f408-dfd8-4776-933e-b1e2cdfb3b3c	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-2	fd611121-ebc2-4520-a578-412179ec1a48	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-29 21:31:24.338
fd0a81e6-06b1-4dc1-bb6d-0de7a7cae425	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-8	3ca11321-da07-4e7d-b771-94efb352f30a	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-29 21:32:55.373
9ba6f46c-f4a1-4acd-8c22-3c486c159a38	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-2	cab83523-d8aa-4be9-87e1-9770edb4b1a2	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 06:02:04.397
57c9e6a7-6cf4-42db-b6e4-b7d762e70a36	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-2	5b7be39e-750f-4462-b69c-be68012fa2d0	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 06:04:46.534
dde9563a-aeb4-490e-9a85-424ec235a7ac	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-3	08ead35e-4f3e-40c9-bdda-5cb59cce84ce	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 07:22:35.054
3add574f-783c-428f-8363-7482d2257fc1	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-1	0db6bc79-9f10-40f5-bad2-b371278ef91c	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 07:28:23.778
b1522b53-af3c-498d-8d13-6d67b466f24f	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-1	f14537c2-3fa9-4e51-8082-50737450f0ff	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 07:29:08.773
b4a1006c-8c57-46a3-a4df-eed2d2cb6464	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-1	1ad7958c-b3e4-4012-b934-1337a09b6adc	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 12:44:46.873
49f6a4e8-27f6-4280-bdb5-b92928748077	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-2	e55d8231-34a4-405e-992e-eacd97bf786e	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 12:57:47.579
20a4c9b7-7e40-42cf-ad78-23785fdb2352	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-3	17223a3f-784a-41ab-b094-b566c413bbee	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 15:33:35.568
901cb971-83e7-499f-ab04-e3d037f2362a	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-1	2731af07-d7fc-4c07-86d8-0140af35ffec	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 18:46:33.002
936f3ac5-e9bb-4a40-8e17-b16083c9cc45	ca23c44a-9483-44c3-bc54-f4d994150255	aa99628b-1ac8-4e36-9700-9c9abb66dc98	79f46333-337e-4489-bec5-db8307aeb9db	SALE	-1	91a92943-f9b4-46cf-990d-d6722f16ccfb	Sale	\N	5b1de4b1-063a-4dcc-8485-f2f89992dc8c	2026-10-30 18:46:33.067
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.suppliers (id, "pharmacyId", name, "taxId", phone, email, address, city, province, notes, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sync_operations; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.sync_operations (id, "pharmacyId", "clientId", "idempotencyKey", "operationType", status, payload, result, "saleId", "rejectionCode", "rejectionReason", "createdAt", "processedAt") FROM stdin;
f11e7453-d225-42b0-be37-9f01208ad65d	ca23c44a-9483-44c3-bc54-f4d994150255	teste-pos	80337c43-d4e8-4cfe-9ba1-ad0805801f21	SALE	PROCESSED	{"lines": [{"quantity": 2, "productId": "aa99628b-1ac8-4e36-9700-9c9abb66dc98"}]}	{"saleId": "fd611121-ebc2-4520-a578-412179ec1a48", "shortages": [], "saleNumber": "VND-000001"}	fd611121-ebc2-4520-a578-412179ec1a48	\N	\N	2026-10-29 21:31:24.372	2026-10-29 21:31:24.367
3a7db15d-35b6-4c66-813e-1e7a1b7e82c7	ca23c44a-9483-44c3-bc54-f4d994150255	teste-pos	4ac2d268-286a-44f8-8f8b-f549eb33bbbd	SALE	CONFLICT	{"lines": [{"quantity": 10, "productId": "aa99628b-1ac8-4e36-9700-9c9abb66dc98"}]}	{"saleId": "3ca11321-da07-4e7d-b771-94efb352f30a", "shortages": [{"missing": 2, "productId": "aa99628b-1ac8-4e36-9700-9c9abb66dc98"}], "saleNumber": "VND-000002"}	3ca11321-da07-4e7d-b771-94efb352f30a	STOCK_SHORTAGE	Stock insuficiente no momento da sincronização. Venda registada com stock a zero; rever o stock.	2026-10-29 21:32:55.402	2026-10-29 21:32:55.4
302dec40-b53b-44b7-b600-97e2e520f649	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	07b1ee17-4cab-443f-b211-40a342dbec79	SALE	REJECTED	{"lines": [{"quantity": 1, "productId": "f2b4cc7c-307e-4178-949c-3beff2b7455b"}, {"quantity": 1, "productId": "7baa5c7a-d77d-4617-8133-0b1c10a2fab3"}, {"quantity": 1, "productId": "e62a16a8-6ba3-410d-b00d-4a93121d9208"}]}	\N	\N	INVALID_PRODUCT	Um ou mais produtos são inválidos ou inativos.	2026-10-30 05:37:26.237	2026-10-30 05:37:26.233
d8cd4152-6340-4aae-bec9-cf46878e2d87	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	1c7cc1c7-ed3f-42f2-a043-f275554719e4	SALE	REJECTED	{"lines": [{"quantity": 1, "productId": "6c90f5e7-6d4d-4407-9cd5-49b1e216a86b"}, {"quantity": 1, "productId": "e62a16a8-6ba3-410d-b00d-4a93121d9208"}, {"quantity": 1, "productId": "7baa5c7a-d77d-4617-8133-0b1c10a2fab3"}, {"quantity": 1, "productId": "6f42d97a-41ef-4007-a6d8-8c70314cae45"}]}	\N	\N	INVALID_PRODUCT	Um ou mais produtos são inválidos ou inativos.	2026-10-30 05:37:26.274	2026-10-30 05:37:26.273
9d35f3a4-3c9a-424a-af97-b4da8f254f27	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	28c04d01-101d-4463-9600-609730b1e14e	SALE	REJECTED	{"lines": [{"quantity": 1, "productId": "e62a16a8-6ba3-410d-b00d-4a93121d9208"}, {"quantity": 1, "productId": "6c90f5e7-6d4d-4407-9cd5-49b1e216a86b"}, {"quantity": 1, "productId": "6f42d97a-41ef-4007-a6d8-8c70314cae45"}]}	\N	\N	INVALID_PRODUCT	Um ou mais produtos são inválidos ou inativos.	2026-10-30 05:37:26.299	2026-10-30 05:37:26.297
a027d161-77e3-4b8d-92d8-f1595a42d443	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	8707e05f-f8a9-4c45-9578-fb6f8e456d0d	SALE	REJECTED	{"lines": [{"quantity": 1, "productId": "f2b4cc7c-307e-4178-949c-3beff2b7455b"}, {"quantity": 1, "productId": "7baa5c7a-d77d-4617-8133-0b1c10a2fab3"}, {"quantity": 1, "productId": "e62a16a8-6ba3-410d-b00d-4a93121d9208"}]}	\N	\N	INVALID_PRODUCT	Um ou mais produtos são inválidos ou inativos.	2026-10-30 05:37:26.314	2026-10-30 05:37:26.312
e8fe16da-d65b-4543-a0fd-bc83c7a24f10	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	a478b2e2-1300-42a8-88ce-b0e7f25f300b	SALE	PROCESSED	{"lines": [{"quantity": 2, "productId": "aa99628b-1ac8-4e36-9700-9c9abb66dc98"}]}	{"saleId": "5b7be39e-750f-4462-b69c-be68012fa2d0", "shortages": [], "saleNumber": "VND-000005"}	5b7be39e-750f-4462-b69c-be68012fa2d0	\N	\N	2026-10-30 06:04:46.633	2026-10-30 06:04:46.629
81df379e-5dec-444d-a9a3-00ce7b657c18	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	9642ee1f-4c76-4065-bae0-6244f4812d17	PAYMENT	PROCESSED	{"amount": 110, "method": "CASH", "saleKey": "a478b2e2-1300-42a8-88ce-b0e7f25f300b"}	{"saleId": "5b7be39e-750f-4462-b69c-be68012fa2d0", "paymentId": "2f3f4544-0e30-49b3-9b0a-f9bef3c88ec6"}	5b7be39e-750f-4462-b69c-be68012fa2d0	\N	\N	2026-10-30 06:04:47.011	2026-10-30 06:04:47.01
35e9f137-50a1-41c1-80d2-353381af45b0	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	6a3ae0b1-2325-440b-87f7-af26bd365678	SALE	PROCESSED	{"lines": [{"quantity": 3, "productId": "aa99628b-1ac8-4e36-9700-9c9abb66dc98"}]}	{"saleId": "17223a3f-784a-41ab-b094-b566c413bbee", "shortages": [], "saleNumber": "VND-000015"}	17223a3f-784a-41ab-b094-b566c413bbee	\N	\N	2026-10-30 15:33:35.598	2026-10-30 15:33:35.589
e14e45be-3be1-417f-935e-424167b3cf6c	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	8d77bd58-677a-4d92-add7-cb3147fee110	PAYMENT	PROCESSED	{"amount": 165, "method": "MPESA", "saleKey": "6a3ae0b1-2325-440b-87f7-af26bd365678"}	{"saleId": "17223a3f-784a-41ab-b094-b566c413bbee", "paymentId": "7572e8ff-940b-4a55-bf5c-7f2cd9f83c8e"}	17223a3f-784a-41ab-b094-b566c413bbee	\N	\N	2026-10-30 15:33:35.664	2026-10-30 15:33:35.656
c8a67e59-4099-4266-8307-1583f3f13e74	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	0ca4158b-c386-4caa-92e3-43c1b0790cca	SALE	PROCESSED	{"lines": [{"quantity": 1, "productId": "aa99628b-1ac8-4e36-9700-9c9abb66dc98"}]}	{"saleId": "2731af07-d7fc-4c07-86d8-0140af35ffec", "shortages": [], "saleNumber": "VND-000016"}	2731af07-d7fc-4c07-86d8-0140af35ffec	\N	\N	2026-10-30 18:46:33.036	2026-10-30 18:46:33.034
58ec769f-90ad-4775-afaa-7f1fe1ab5634	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	60d5c06a-218e-479d-bfde-09a6848bef08	SALE	PROCESSED	{"lines": [{"quantity": 1, "productId": "aa99628b-1ac8-4e36-9700-9c9abb66dc98"}]}	{"saleId": "91a92943-f9b4-46cf-990d-d6722f16ccfb", "shortages": [], "saleNumber": "VND-000017"}	91a92943-f9b4-46cf-990d-d6722f16ccfb	\N	\N	2026-10-30 18:46:33.08	2026-10-30 18:46:33.078
afd78f2e-9f4f-4bba-88e2-c42e1ff324a9	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	5578d347-2a10-4d88-a1f4-dc824f87ebf2	PAYMENT	PROCESSED	{"amount": 55, "method": "MPESA", "saleKey": "0ca4158b-c386-4caa-92e3-43c1b0790cca"}	{"saleId": "2731af07-d7fc-4c07-86d8-0140af35ffec", "paymentId": "a2e387b7-3d24-483c-8230-0de1d1e69d48"}	2731af07-d7fc-4c07-86d8-0140af35ffec	\N	\N	2026-10-30 18:46:33.125	2026-10-30 18:46:33.123
93dd95e4-14f5-455f-b55c-4a6aa16fcf38	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	760b71da-abcb-4739-8623-2cad6ce86ebd	PAYMENT	PROCESSED	{"amount": 55, "method": "MPESA", "saleKey": "60d5c06a-218e-479d-bfde-09a6848bef08"}	{"saleId": "91a92943-f9b4-46cf-990d-d6722f16ccfb", "paymentId": "15c895c3-a936-4bc4-a977-2d812d820c36"}	91a92943-f9b4-46cf-990d-d6722f16ccfb	\N	\N	2026-10-30 18:46:33.151	2026-10-30 18:46:33.149
2811e9f0-9def-40d2-8da1-122647328967	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	1a2a419b-e70c-4f17-b618-288734907c09	PAYMENT	PENDING	{"amount": 249.98, "method": "MPESA"}	\N	\N	SALE_NOT_SYNCED	Venda ainda não sincronizada.	2026-10-30 05:37:26.328	2026-10-30 05:57:42.511
d976a13d-e13d-4216-8272-b18cadb75f4a	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	2e804ed0-76a7-4b54-9592-b89fc92b8c38	PAYMENT	PENDING	{"amount": 349.98, "method": "MPESA"}	\N	\N	SALE_NOT_SYNCED	Venda ainda não sincronizada.	2026-10-30 05:37:26.341	2026-10-30 05:57:42.522
56dd009d-dbcf-43cd-a7f1-c8d8d2e7ed4c	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	719c154d-24d0-4cf4-b2e6-731f32a8453c	PAYMENT	PENDING	{"amount": 249.99, "method": "MPESA"}	\N	\N	SALE_NOT_SYNCED	Venda ainda não sincronizada.	2026-10-30 05:37:26.363	2026-10-30 05:57:42.535
e802717d-7df3-44c6-8ee3-ea2cda3a54e2	ca23c44a-9483-44c3-bc54-f4d994150255	9c73af08-e54b-47a0-bfb6-4fcaa3af6862	80dcbb17-858c-449f-98e2-4d37fd7e0c53	PAYMENT	PENDING	{"amount": 249.98, "method": "MPESA"}	\N	\N	SALE_NOT_SYNCED	Venda ainda não sincronizada.	2026-10-30 05:37:26.405	2026-10-30 05:57:42.558
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.user_roles ("userId", "roleId") FROM stdin;
5b1de4b1-063a-4dcc-8485-f2f89992dc8c	7f625638-d8f8-4ecd-8c65-9b3904fd17d6
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: farmacia
--

COPY public.users (id, "pharmacyId", email, "passwordHash", "fullName", status, "lastLoginAt", "createdAt", "updatedAt") FROM stdin;
5b1de4b1-063a-4dcc-8485-f2f89992dc8c	ca23c44a-9483-44c3-bc54-f4d994150255	teste@local.test	$2b$10$WBBDdMm8lRu9n/8gGTyHfe8el9vKFl2VN5p6g/eFhKLPwK2XUvcve	Teste Administrador	ACTIVE	2026-10-30 21:32:45.538	2026-10-29 21:24:53.192	2026-10-30 21:32:45.54
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_movements cash_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_pkey PRIMARY KEY (id);


--
-- Name: cash_sessions cash_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pharmacies pharmacies_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_lines purchase_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: quarantine_stock quarantine_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.quarantine_stock
    ADD CONSTRAINT quarantine_stock_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: return_refunds return_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.return_refunds
    ADD CONSTRAINT return_refunds_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY ("roleId", "permissionId");


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sale_line_lots sale_line_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_line_lots
    ADD CONSTRAINT sale_line_lots_pkey PRIMARY KEY (id);


--
-- Name: sale_lines sale_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_lines
    ADD CONSTRAINT sale_lines_pkey PRIMARY KEY (id);


--
-- Name: sale_payments sale_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_pkey PRIMARY KEY (id);


--
-- Name: sale_return_lines sale_return_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_return_lines
    ADD CONSTRAINT sale_return_lines_pkey PRIMARY KEY (id);


--
-- Name: sale_returns sale_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_returns
    ADD CONSTRAINT sale_returns_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: stock_lots stock_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_lots
    ADD CONSTRAINT stock_lots_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: sync_operations sync_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sync_operations
    ADD CONSTRAINT sync_operations_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY ("userId", "roleId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_entity_entityId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "audit_logs_entity_entityId_idx" ON public.audit_logs USING btree (entity, "entityId");


--
-- Name: audit_logs_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "audit_logs_pharmacyId_idx" ON public.audit_logs USING btree ("pharmacyId");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: cash_movements_cashSessionId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "cash_movements_cashSessionId_idx" ON public.cash_movements USING btree ("cashSessionId");


--
-- Name: cash_movements_expenseId_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "cash_movements_expenseId_key" ON public.cash_movements USING btree ("expenseId");


--
-- Name: cash_sessions_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "cash_sessions_pharmacyId_idx" ON public.cash_sessions USING btree ("pharmacyId");


--
-- Name: cash_sessions_status_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX cash_sessions_status_idx ON public.cash_sessions USING btree (status);


--
-- Name: cash_sessions_userId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "cash_sessions_userId_idx" ON public.cash_sessions USING btree ("userId");


--
-- Name: categories_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "categories_pharmacyId_idx" ON public.categories USING btree ("pharmacyId");


--
-- Name: categories_pharmacyId_name_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "categories_pharmacyId_name_key" ON public.categories USING btree ("pharmacyId", name);


--
-- Name: expenses_category_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX expenses_category_idx ON public.expenses USING btree (category);


--
-- Name: expenses_expenseDate_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "expenses_expenseDate_idx" ON public.expenses USING btree ("expenseDate");


--
-- Name: expenses_method_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX expenses_method_idx ON public.expenses USING btree (method);


--
-- Name: expenses_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "expenses_pharmacyId_idx" ON public.expenses USING btree ("pharmacyId");


--
-- Name: expenses_status_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX expenses_status_idx ON public.expenses USING btree (status);


--
-- Name: login_attempts_email_createdAt_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "login_attempts_email_createdAt_idx" ON public.login_attempts USING btree (email, "createdAt");


--
-- Name: login_attempts_ipAddress_createdAt_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "login_attempts_ipAddress_createdAt_idx" ON public.login_attempts USING btree ("ipAddress", "createdAt");


--
-- Name: permissions_code_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code);


--
-- Name: pharmacies_nif_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX pharmacies_nif_key ON public.pharmacies USING btree (nif);


--
-- Name: products_categoryId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "products_categoryId_idx" ON public.products USING btree ("categoryId");


--
-- Name: products_pharmacyId_barcode_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "products_pharmacyId_barcode_key" ON public.products USING btree ("pharmacyId", barcode);


--
-- Name: products_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "products_pharmacyId_idx" ON public.products USING btree ("pharmacyId");


--
-- Name: products_pharmacyId_sku_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "products_pharmacyId_sku_key" ON public.products USING btree ("pharmacyId", sku);


--
-- Name: purchase_lines_productId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "purchase_lines_productId_idx" ON public.purchase_lines USING btree ("productId");


--
-- Name: purchase_lines_purchaseId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "purchase_lines_purchaseId_idx" ON public.purchase_lines USING btree ("purchaseId");


--
-- Name: purchases_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "purchases_pharmacyId_idx" ON public.purchases USING btree ("pharmacyId");


--
-- Name: purchases_pharmacyId_supplierId_documentNumber_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "purchases_pharmacyId_supplierId_documentNumber_key" ON public.purchases USING btree ("pharmacyId", "supplierId", "documentNumber");


--
-- Name: purchases_supplierId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "purchases_supplierId_idx" ON public.purchases USING btree ("supplierId");


--
-- Name: quarantine_stock_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "quarantine_stock_pharmacyId_idx" ON public.quarantine_stock USING btree ("pharmacyId");


--
-- Name: quarantine_stock_productId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "quarantine_stock_productId_idx" ON public.quarantine_stock USING btree ("productId");


--
-- Name: refresh_tokens_expiresAt_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "refresh_tokens_expiresAt_idx" ON public.refresh_tokens USING btree ("expiresAt");


--
-- Name: refresh_tokens_familyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "refresh_tokens_familyId_idx" ON public.refresh_tokens USING btree ("familyId");


--
-- Name: refresh_tokens_jti_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX refresh_tokens_jti_key ON public.refresh_tokens USING btree (jti);


--
-- Name: refresh_tokens_userId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "refresh_tokens_userId_idx" ON public.refresh_tokens USING btree ("userId");


--
-- Name: return_refunds_idempotencyKey_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "return_refunds_idempotencyKey_key" ON public.return_refunds USING btree ("idempotencyKey");


--
-- Name: return_refunds_returnLineId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "return_refunds_returnLineId_idx" ON public.return_refunds USING btree ("returnLineId");


--
-- Name: return_refunds_salePaymentId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "return_refunds_salePaymentId_idx" ON public.return_refunds USING btree ("salePaymentId");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: sale_line_lots_lotId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_line_lots_lotId_idx" ON public.sale_line_lots USING btree ("lotId");


--
-- Name: sale_line_lots_saleLineId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_line_lots_saleLineId_idx" ON public.sale_line_lots USING btree ("saleLineId");


--
-- Name: sale_lines_productId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_lines_productId_idx" ON public.sale_lines USING btree ("productId");


--
-- Name: sale_lines_saleId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_lines_saleId_idx" ON public.sale_lines USING btree ("saleId");


--
-- Name: sale_payments_cashSessionId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_payments_cashSessionId_idx" ON public.sale_payments USING btree ("cashSessionId");


--
-- Name: sale_payments_idempotencyKey_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "sale_payments_idempotencyKey_key" ON public.sale_payments USING btree ("idempotencyKey");


--
-- Name: sale_payments_saleId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_payments_saleId_idx" ON public.sale_payments USING btree ("saleId");


--
-- Name: sale_return_lines_returnId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_return_lines_returnId_idx" ON public.sale_return_lines USING btree ("returnId");


--
-- Name: sale_return_lines_saleLineId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_return_lines_saleLineId_idx" ON public.sale_return_lines USING btree ("saleLineId");


--
-- Name: sale_returns_confirmationKey_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "sale_returns_confirmationKey_key" ON public.sale_returns USING btree ("confirmationKey");


--
-- Name: sale_returns_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_returns_pharmacyId_idx" ON public.sale_returns USING btree ("pharmacyId");


--
-- Name: sale_returns_pharmacyId_returnNumber_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "sale_returns_pharmacyId_returnNumber_key" ON public.sale_returns USING btree ("pharmacyId", "returnNumber");


--
-- Name: sale_returns_saleId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sale_returns_saleId_idx" ON public.sale_returns USING btree ("saleId");


--
-- Name: sales_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sales_pharmacyId_idx" ON public.sales USING btree ("pharmacyId");


--
-- Name: sales_pharmacyId_saleNumber_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "sales_pharmacyId_saleNumber_key" ON public.sales USING btree ("pharmacyId", "saleNumber");


--
-- Name: stock_lots_expiryDate_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "stock_lots_expiryDate_idx" ON public.stock_lots USING btree ("expiryDate");


--
-- Name: stock_lots_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "stock_lots_pharmacyId_idx" ON public.stock_lots USING btree ("pharmacyId");


--
-- Name: stock_lots_pharmacyId_productId_lotNumber_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "stock_lots_pharmacyId_productId_lotNumber_key" ON public.stock_lots USING btree ("pharmacyId", "productId", "lotNumber");


--
-- Name: stock_lots_productId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "stock_lots_productId_idx" ON public.stock_lots USING btree ("productId");


--
-- Name: stock_movements_createdAt_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "stock_movements_createdAt_idx" ON public.stock_movements USING btree ("createdAt");


--
-- Name: stock_movements_lotId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "stock_movements_lotId_idx" ON public.stock_movements USING btree ("lotId");


--
-- Name: stock_movements_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "stock_movements_pharmacyId_idx" ON public.stock_movements USING btree ("pharmacyId");


--
-- Name: stock_movements_productId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "stock_movements_productId_idx" ON public.stock_movements USING btree ("productId");


--
-- Name: suppliers_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "suppliers_pharmacyId_idx" ON public.suppliers USING btree ("pharmacyId");


--
-- Name: sync_operations_idempotencyKey_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX "sync_operations_idempotencyKey_key" ON public.sync_operations USING btree ("idempotencyKey");


--
-- Name: sync_operations_pharmacyId_status_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "sync_operations_pharmacyId_status_idx" ON public.sync_operations USING btree ("pharmacyId", status);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_pharmacyId_idx; Type: INDEX; Schema: public; Owner: farmacia
--

CREATE INDEX "users_pharmacyId_idx" ON public.users USING btree ("pharmacyId");


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_cashSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT "cash_movements_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES public.cash_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_movements cash_movements_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT "cash_movements_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cash_movements cash_movements_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT "cash_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_sessions cash_sessions_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT "cash_sessions_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_sessions cash_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT "cash_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: categories categories_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_cashSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES public.cash_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_confirmedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: login_attempts login_attempts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "products_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_lines purchase_lines_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT "purchase_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_lines purchase_lines_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT "purchase_lines_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public.purchases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchases purchases_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "purchases_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchases purchases_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quarantine_stock quarantine_stock_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.quarantine_stock
    ADD CONSTRAINT "quarantine_stock_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quarantine_stock quarantine_stock_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.quarantine_stock
    ADD CONSTRAINT "quarantine_stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quarantine_stock quarantine_stock_saleReturnLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.quarantine_stock
    ADD CONSTRAINT "quarantine_stock_saleReturnLineId_fkey" FOREIGN KEY ("saleReturnLineId") REFERENCES public.sale_return_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refresh_tokens refresh_tokens_replacedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES public.refresh_tokens(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: refresh_tokens refresh_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: return_refunds return_refunds_cashSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.return_refunds
    ADD CONSTRAINT "return_refunds_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES public.cash_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: return_refunds return_refunds_confirmedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.return_refunds
    ADD CONSTRAINT "return_refunds_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: return_refunds return_refunds_returnLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.return_refunds
    ADD CONSTRAINT "return_refunds_returnLineId_fkey" FOREIGN KEY ("returnLineId") REFERENCES public.sale_return_lines(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: return_refunds return_refunds_salePaymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.return_refunds
    ADD CONSTRAINT "return_refunds_salePaymentId_fkey" FOREIGN KEY ("salePaymentId") REFERENCES public.sale_payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: return_refunds return_refunds_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.return_refunds
    ADD CONSTRAINT "return_refunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: role_permissions role_permissions_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sale_line_lots sale_line_lots_lotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_line_lots
    ADD CONSTRAINT "sale_line_lots_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES public.stock_lots(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_line_lots sale_line_lots_saleLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_line_lots
    ADD CONSTRAINT "sale_line_lots_saleLineId_fkey" FOREIGN KEY ("saleLineId") REFERENCES public.sale_lines(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sale_lines sale_lines_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_lines
    ADD CONSTRAINT "sale_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_lines sale_lines_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_lines
    ADD CONSTRAINT "sale_lines_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sale_payments sale_payments_cashSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT "sale_payments_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES public.cash_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_payments sale_payments_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT "sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_payments sale_payments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT "sale_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_return_lines sale_return_lines_lotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_return_lines
    ADD CONSTRAINT "sale_return_lines_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES public.stock_lots(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sale_return_lines sale_return_lines_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_return_lines
    ADD CONSTRAINT "sale_return_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_return_lines sale_return_lines_returnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_return_lines
    ADD CONSTRAINT "sale_return_lines_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES public.sale_returns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sale_return_lines sale_return_lines_saleLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_return_lines
    ADD CONSTRAINT "sale_return_lines_saleLineId_fkey" FOREIGN KEY ("saleLineId") REFERENCES public.sale_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_returns sale_returns_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_returns
    ADD CONSTRAINT "sale_returns_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_returns sale_returns_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_returns
    ADD CONSTRAINT "sale_returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_returns sale_returns_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sale_returns
    ADD CONSTRAINT "sale_returns_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales sales_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "sales_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales sales_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_lots stock_lots_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_lots
    ADD CONSTRAINT "stock_lots_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_lots stock_lots_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_lots
    ADD CONSTRAINT "stock_lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_lots stock_lots_purchaseLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_lots
    ADD CONSTRAINT "stock_lots_purchaseLineId_fkey" FOREIGN KEY ("purchaseLineId") REFERENCES public.purchase_lines(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_lotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES public.stock_lots(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suppliers suppliers_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "suppliers_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_pharmacyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farmacia
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES public.pharmacies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict eS6cVPPKh6ccHdgBsrxeSURZlbq2UiVLbYuYNw0g1rfbPv9mGc35iV8h9hl5wpM

