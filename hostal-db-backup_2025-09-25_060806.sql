--
-- PostgreSQL database dump
--

\restrict D0Ry7XsTRgJGukeIeNboIeLm1wufa3tlQlZ4vNKgohVEb7dVOJqEVNwuQWCkNRf

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

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
-- Name: period; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.period AS ENUM (
    'day',
    'week',
    'fortnight',
    'month'
);


--
-- Name: reservationstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reservationstatus AS ENUM (
    'pending',
    'active',
    'checked_out',
    'cancelled'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    guest_id integer NOT NULL,
    mac character varying(17) NOT NULL,
    name character varying(100),
    vendor character varying(100),
    allowed boolean DEFAULT true NOT NULL
);


--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guests (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    document_id character varying(100) NOT NULL,
    phone character varying(50),
    email character varying(255),
    notes character varying(500)
);


--
-- Name: guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id integer NOT NULL,
    guest_id integer NOT NULL,
    room_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    period public.period NOT NULL,
    periods_count integer DEFAULT 1 NOT NULL,
    price_bs numeric(12,2) NOT NULL,
    rate_usd numeric(12,6),
    rate_eur numeric(12,6),
    status public.reservationstatus DEFAULT 'pending'::public.reservationstatus NOT NULL,
    notes character varying(500)
);


--
-- Name: reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    number character varying(20) NOT NULL,
    base_price_bs numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL
);


--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- Name: reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
0003_add_reservations
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, guest_id, mac, name, vendor, allowed) FROM stdin;
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guests (id, full_name, document_id, phone, email, notes) FROM stdin;
1	Ana Pérez	V-12345678	0414-0000000	ana@ejemplo.com	\N
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservations (id, guest_id, room_id, start_date, end_date, period, periods_count, price_bs, rate_usd, rate_eur, status, notes) FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rooms (id, number, base_price_bs, status) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, hashed_password, role) FROM stdin;
1	admin@hostal.com	$2b$12$rWepPj/BOZjNh3C5RDM78OJIvkRCdq8lTyf0xAhT2.54iNpi1KRsS	admin
2	recep@hostal.com	$2b$12$A5wWyX1FzvpkKXLwJVr4SeRVZQ5IMDh7BgZtcVsD3ljVCYa7hKNjy	recepcionista
\.


--
-- Name: devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.devices_id_seq', 1, true);


--
-- Name: guests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.guests_id_seq', 1, true);


--
-- Name: reservations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reservations_id_seq', 1, false);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rooms_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_number_key UNIQUE (number);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_devices_guest_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_devices_guest_id ON public.devices USING btree (guest_id);


--
-- Name: ix_devices_mac; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_devices_mac ON public.devices USING btree (mac);


--
-- Name: ix_guests_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_guests_document_id ON public.guests USING btree (document_id);


--
-- Name: ix_guests_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_guests_full_name ON public.guests USING btree (full_name);


--
-- Name: ix_reservations_guest_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reservations_guest_id ON public.reservations USING btree (guest_id);


--
-- Name: ix_reservations_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reservations_room_id ON public.reservations USING btree (room_id);


--
-- Name: ix_reservations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reservations_status ON public.reservations USING btree (status);


--
-- Name: ix_rooms_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_rooms_number ON public.rooms USING btree (number);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: devices devices_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE RESTRICT;


--
-- Name: reservations reservations_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict D0Ry7XsTRgJGukeIeNboIeLm1wufa3tlQlZ4vNKgohVEb7dVOJqEVNwuQWCkNRf

