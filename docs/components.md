# O que é um componente neste momento

Um trecho de código que renderiza um elemento ou um conjunto de elementos HTML, que pode ser reutilizado em diferentes partes do site que está sendo editado pelo editor.


neste momento um componente é um HTML
 - só pode ter um elemento raiz

## Especificação de um componente

1 - a tag raiz do componente recebe a propriedade data-component="nome-do-componente"
2 - o nome do arquivo é o caminho do arquivo do componente na pasta /componentes/ ex: components/cards/card.html
3 - O nome do arquivo será usado para buscar o arquivo do component e no servidor quando o site for carregado.

Como o usuário define um componente ?

1 - o usuário clica como botão direito no elemento raiz que deseja transformar em componente no explorer de html
2 - em seguida vai aparecer um dialog pedindo para o usuário dar um nome para o componente
3 - uma vez nomeado o componente ele vai aparecer no explorer de componentes
4 - a tag raiz do componente recebe um background cinza claro e um contorno roxo
5 - o componente não pode ser editado, ele so pode ser editado se for clicado no botão de edição de componente
6 - para editar um componente o usuário deve clicar com o botão direito no componente no explorer de html e selecionar a opção "editar componente"

Observação nada pode ser editado no html do componente se não for clicado no botão de edição de edição de componente

## Como o usuário insere um componente no documento ?

Da mesma forma que insere os elementos html

Toda componente existente deve aparece na listagem de tags html para inserir no documento

## Quando o usuário criar um componente , ele deve ser salvo como 

## Como salvar e carregar componentes no sistema ?
salva em  componentes/{nome-do-componente}.html

antes enviar o html do site para o servidor, o editor remove os componentes existentes e coloca uma "tag" <component name="nome-do-componente.html"></component> repare que o name é exatamente o caminho do arquivo do componente.

que o html removido deve ser enviado para o servidor para um endpoint que irá salvar o arquivo do componente no servidor no local definido no data-component, que pode ser data-component="nome-do-componente" ou data-component="nome-da-pasta/nome-do-componente"

O componente deve ser salvo no local especificado no data-component="nome-do-componente" e poderá ter subpastas.

ex: <component name="nome-do-componente.html"></component> poderá ser salvo como componentes/nome-do-componente.html

## quando o servidor enviar o site de volta para o editor 
- ele deve substituir a tag <component name="nome-do-componente.html"></component> pelo conteúdo do arquivo nome-do-componente.html que foi salvo no servidor no local especificado no data-component="nome-do-componente" mantendo data-component="nome-do-componente" na raiz do componente carregado
- os arquivos dos componentes devem ser enviados para o editor também, os arquivos devem ser carregados no explorer de componentes que ainda não existe no sistema 