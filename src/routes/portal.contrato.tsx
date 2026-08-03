import { createFileRoute } from "@tanstack/react-router";
import { PortalDocumentosPage } from "./portal.documentos";

export const Route = createFileRoute("/portal/contrato")({
  head: () => ({
    meta: [
      { title: "Documentos & Contratos — Portal do Cliente" },
      { name: "description", content: "Documentos oficiais e contratos de prestação de serviços." },
    ],
  }),
  component: PortalDocumentosPage,
});
