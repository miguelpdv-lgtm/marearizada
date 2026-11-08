"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Table, Td, Th } from "@/components/admin/ui";
import { formatCOP, formatDate } from "@/lib/format";

export type ClienteFila = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  totalVisitas: number;
  visitasActivas: number;
  gastoTotal: number;
  ultimaVisita: string | null;
  primeraVisita: string | null;
};

const ORDEN = {
  reciente: { label: "Última actividad", cmp: (a: ClienteFila, b: ClienteFila) => tiempo(b.ultimaVisita) - tiempo(a.ultimaVisita) },
  gasto: { label: "Gasto total", cmp: (a: ClienteFila, b: ClienteFila) => b.gastoTotal - a.gastoTotal },
  visitas: { label: "Visitas", cmp: (a: ClienteFila, b: ClienteFila) => b.totalVisitas - a.totalVisitas },
  nombre: { label: "Nombre (A-Z)", cmp: (a: ClienteFila, b: ClienteFila) => a.name.localeCompare(b.name, "es") },
} as const;
type OrdenKey = keyof typeof ORDEN;

function tiempo(fecha: string | null) {
  return fecha ? new Date(fecha).getTime() : -Infinity;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function ClientesTable({ clientes }: { clientes: ClienteFila[] }) {
  const [query, setQuery] = useState("");
  const [orden, setOrden] = useState<OrdenKey>("reciente");
  const buscado = normalize(query.trim());

  const visibles = useMemo(() => {
    const filtrados = clientes.filter((c) => {
      if (!buscado) return true;
      return normalize(`${c.name} ${c.phone}`).includes(buscado);
    });
    return [...filtrados].sort(ORDEN[orden].cmp);
  }, [clientes, buscado, orden]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o celular…"
          className="w-full max-w-sm rounded-lg border border-stone bg-white px-4 py-2.5 text-sm text-ink placeholder:text-clay focus:border-gold-500 focus:outline-none"
        />
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as OrdenKey)}
          className="rounded-lg border border-stone bg-white px-3 py-2.5 text-sm text-ink focus:border-gold-500 focus:outline-none"
        >
          {Object.entries(ORDEN).map(([key, o]) => (
            <option key={key} value={key}>
              Ordenar por: {o.label}
            </option>
          ))}
        </select>
        <p className="t-small ml-auto shrink-0">
          {visibles.length} {visibles.length === 1 ? "cliente" : "clientes"}
        </p>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Cliente</Th>
            <Th>Celular</Th>
            <Th className="hidden sm:table-cell">Visitas</Th>
            <Th>Gasto total</Th>
            <Th className="hidden sm:table-cell">Última actividad</Th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((c) => (
            <tr key={c.id} className="transition-colors hover:bg-sand/30">
              <Td>
                <Link
                  href={`/admin/clientes/${c.id}`}
                  className="text-sm text-ink underline-offset-2 hover:text-terra hover:underline"
                >
                  {c.name}
                </Link>
                {c.email && <p className="mt-0.5 truncate text-xs font-normal text-muted">{c.email}</p>}
              </Td>
              <Td className="text-sm font-normal text-muted">{c.phone}</Td>
              <Td className="hidden text-sm font-normal text-muted sm:table-cell">
                {c.totalVisitas} {c.visitasActivas > 0 && `· ${c.visitasActivas} activas`}
              </Td>
              <Td className="text-sm font-normal text-muted">{formatCOP(c.gastoTotal)}</Td>
              <Td className="hidden text-sm font-normal text-muted sm:table-cell">
                {c.ultimaVisita ? formatDate(c.ultimaVisita) : "—"}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
