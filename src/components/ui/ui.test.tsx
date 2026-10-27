import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, Chip, EmptyState, ErrorState, IconButton, ScoreBadge, TextField, TOAST_DURATION_MS, ToastProvider, useToast } from ".";

describe("Button", () => {
  it("é type=button por padrão e fica desativado enquanto carrega", () => {
    render(<Button loading>Enviar</Button>);
    const btn = screen.getByRole("button", { name: "Enviar" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("mantém a área de toque mínima de 44 px em todos os tamanhos", () => {
    render(
      <>
        <Button>Principal</Button>
        <Button size="sm">Pequeno</Button>
      </>,
    );
    for (const btn of screen.getAllByRole("button")) expect(btn.className).toContain("min-h-touch");
  });
});

describe("IconButton", () => {
  it("tem rótulo acessível", () => {
    render(<IconButton label="Salvar" />);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });
});

describe("Chip", () => {
  it("expõe o estado selecionado", () => {
    render(<Chip selected>3 quartos</Chip>);
    expect(screen.getByRole("button", { name: "3 quartos" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ScoreBadge", () => {
  it.each([
    [92, "atende ao perfil", "text-ok"],
    [80, "atende em parte", "text-warn"],
    [60, "não atende ao perfil", "text-bad"],
  ])("nota %i usa a faixa certa", (score, label, cls) => {
    render(<ScoreBadge score={score} />);
    const el = screen.getByLabelText(`Compatibilidade ${score}%, ${label}`);
    expect(el).toHaveTextContent(`${score}%`);
    expect(el.className).toContain(cls);
  });

  it("arredonda antes de escolher a faixa", () => {
    render(<ScoreBadge score={84.6} />);
    expect(screen.getByText("85%").className).toContain("text-ok");
  });
});

describe("TextField", () => {
  it("liga rótulo e erro ao campo", () => {
    render(<TextField label="Código" error="Código incorreto." />);
    const input = screen.getByLabelText("Código");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Código incorreto.");
  });
});

describe("Estados", () => {
  it("erro é anunciado e mostra a ação", () => {
    render(<ErrorState title="Não conseguimos carregar." action={<Button>Tentar de novo</Button>} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não conseguimos carregar.");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("vazio mostra a frase e a ação", () => {
    render(<EmptyState title="Nada salvo ainda." action={<Button>Voltar para a conversa</Button>} />);
    expect(screen.getByText("Nada salvo ainda.")).toBeInTheDocument();
  });
});

describe("Toast", () => {
  afterEach(() => vi.useRealTimers());

  function Trigger() {
    const { showToast } = useToast();
    return <Button onClick={() => showToast("Salvo")}>Salvar</Button>;
  }

  it("aparece e some depois de 3 segundos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Salvo");
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
  });
});
